import express from 'express';
import yaml from 'js-yaml';
import {
  appendGeneratedRule,
  buildAlertRule,
  parseRuleFile
} from './lib/alerts.js';
import { applySimpleConfig, buildSimpleConfigModel, loadConfigFiles, saveConfigFiles } from './lib/config.js';
import { restartContainer } from './lib/docker-control.js';
import { readTextOrEmpty } from './lib/files.js';
import { collectHealthSummary } from './lib/health.js';
import { managedPaths, managedContainers, serviceUrls } from './lib/paths.js';
import { appendVersion, createSnapshot, readVersions, restoreSnapshot } from './lib/state.js';
import type { ApplyRequest, CreateAlertRequest, RollbackRequest } from './lib/types.js';
import { validateConfigPair } from './lib/validation.js';

const app = express();
app.use(express.json({ limit: '5mb' }));

const port = Number(process.env.PORT || 3001);

async function reloadPrometheus(): Promise<void> {
  const response = await fetch(`${serviceUrls.prometheus}/-/reload`, { method: 'POST' });
  if (!response.ok) {
    throw new Error(`prometheus reload failed: ${response.status}`);
  }
}

async function restartServices(services: string[]): Promise<void> {
  for (const service of services) {
    await restartContainer(service);
  }
}

function nextVersionId(): string {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

async function runPostApplyChecks(): Promise<{ healthy: boolean; details: unknown }> {
  const status = await collectHealthSummary();
  return {
    healthy: status.stackHealthy,
    details: status
  };
}

app.get('/api/status', async (_req, res) => {
  try {
    const status = await collectHealthSummary();
    return res.json(status);
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

app.get('/api/targets', async (_req, res) => {
  try {
    const response = await fetch(`${serviceUrls.prometheus}/api/v1/targets`);
    if (!response.ok) {
      return res.status(502).json({ error: `prometheus returned ${response.status}` });
    }

    const data = (await response.json()) as {
      data?: {
        activeTargets?: Array<{
          labels?: { job?: string; instance?: string };
          health?: string;
          lastError?: string;
        }>;
      };
    };

    const targets = (data.data?.activeTargets || []).map((target) => ({
      job: target.labels?.job || 'unknown',
      instance: target.labels?.instance || 'unknown',
      health: target.health || 'unknown',
      lastError: target.lastError || ''
    }));

    return res.json({ targets });
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

app.get('/api/config', async (_req, res) => {
  try {
    const files = await loadConfigFiles();
    const simple = await buildSimpleConfigModel(files);
    return res.json({
      simple,
      raw: {
        prometheusYaml: files.prometheusYaml,
        collectorYaml: files.collectorYaml,
        tempoYaml: files.tempoYaml,
        lokiYaml: files.lokiYaml
      }
    });
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

app.post('/api/config/validate', async (req, res) => {
  try {
    const files = await loadConfigFiles();
    const payload = req.body as ApplyRequest;

    let candidate = files;
    if (payload.simple) {
      candidate = applySimpleConfig(candidate, payload.simple);
    }
    if (payload.raw?.prometheusYaml) {
      candidate.prometheusYaml = payload.raw.prometheusYaml;
    }
    if (payload.raw?.collectorYaml) {
      candidate.collectorYaml = payload.raw.collectorYaml;
    }
    if (payload.raw?.tempoYaml) {
      candidate.tempoYaml = payload.raw.tempoYaml;
    }
    if (payload.raw?.lokiYaml) {
      candidate.lokiYaml = payload.raw.lokiYaml;
    }
    const validation = validateConfigPair(candidate.prometheusYaml, candidate.collectorYaml, candidate.tempoYaml);
    return res.json(validation);
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

app.post('/api/config/apply', async (req, res) => {
  const payload = req.body as ApplyRequest;
  const versionId = nextVersionId();

  try {
    const current = await loadConfigFiles();

    await createSnapshot(versionId, {
      compose: current.composeYaml,
      prometheus: current.prometheusYaml,
      collector: current.collectorYaml,
      tempo: current.tempoYaml,
      loki: current.lokiYaml,
      alertRules: current.alertRulesYaml,
      generatedAlerts: current.generatedAlertRulesYaml
    });

    let candidate = current;
    if (payload.simple) {
      candidate = applySimpleConfig(candidate, payload.simple);
    }
    if (payload.raw?.prometheusYaml) {
      candidate.prometheusYaml = payload.raw.prometheusYaml;
    }
    if (payload.raw?.collectorYaml) {
      candidate.collectorYaml = payload.raw.collectorYaml;
    }
    if (payload.raw?.tempoYaml) {
      candidate.tempoYaml = payload.raw.tempoYaml;
    }
    if (payload.raw?.lokiYaml) {
      candidate.lokiYaml = payload.raw.lokiYaml;
    }

    const validation = validateConfigPair(candidate.prometheusYaml, candidate.collectorYaml, candidate.tempoYaml);
    if (!validation.valid) {
      await appendVersion({
        id: versionId,
        createdAt: new Date().toISOString(),
        success: false,
        error: validation.errors.join('; ')
      });
      return res.status(400).json({ success: false, versionId, validation });
    }

    const changed = {
      compose: candidate.composeYaml !== current.composeYaml,
      prometheus: candidate.prometheusYaml !== current.prometheusYaml,
      collector: candidate.collectorYaml !== current.collectorYaml,
      tempo: candidate.tempoYaml !== current.tempoYaml,
      loki: candidate.lokiYaml !== current.lokiYaml,
      alertRules: candidate.alertRulesYaml !== current.alertRulesYaml,
      generatedAlerts: candidate.generatedAlertRulesYaml !== current.generatedAlertRulesYaml
    };

    await saveConfigFiles({
      composeYaml: candidate.composeYaml,
      prometheusYaml: candidate.prometheusYaml,
      collectorYaml: candidate.collectorYaml,
      tempoYaml: candidate.tempoYaml,
      lokiYaml: candidate.lokiYaml,
      alertRulesYaml: candidate.alertRulesYaml,
      generatedAlertRulesYaml: candidate.generatedAlertRulesYaml
    });

    const restarts: string[] = [];
    if (changed.collector) {
      restarts.push('otel-collector');
    }
    if (changed.loki) {
      restarts.push('loki');
    }
    if (changed.tempo) {
      restarts.push('tempo');
    }
    if (changed.compose) {
      restarts.push('prometheus');
    }

    if (restarts.length > 0) {
      await restartServices(restarts);
    }

    if (changed.prometheus || changed.compose || changed.alertRules || changed.generatedAlerts) {
      await reloadPrometheus();
    }

    const postApply = await runPostApplyChecks();
    if (!postApply.healthy) {
      throw new Error('health checks failed after apply');
    }

    await appendVersion({ id: versionId, createdAt: new Date().toISOString(), success: true });
    return res.json({ success: true, versionId, restarted: restarts, checks: postApply.details });
  } catch (error) {
    try {
      const snapshot = await restoreSnapshot(versionId);
      const current = await loadConfigFiles();
      await saveConfigFiles({
        composeYaml: snapshot.compose ?? current.composeYaml,
        prometheusYaml: snapshot.prometheus ?? current.prometheusYaml,
        collectorYaml: snapshot.collector ?? current.collectorYaml,
        tempoYaml: snapshot.tempo ?? current.tempoYaml,
        lokiYaml: snapshot.loki ?? current.lokiYaml,
        alertRulesYaml: snapshot.alertRules ?? current.alertRulesYaml,
        generatedAlertRulesYaml: snapshot.generatedAlerts ?? current.generatedAlertRulesYaml
      });
      await reloadPrometheus();
      await restartServices([...managedContainers]);
    } catch (rollbackError) {
      await appendVersion({
        id: versionId,
        createdAt: new Date().toISOString(),
        success: false,
        error: `apply error: ${(error as Error).message}; rollback error: ${(rollbackError as Error).message}`
      });
      return res.status(500).json({
        success: false,
        versionId,
        error: (error as Error).message,
        rollbackError: (rollbackError as Error).message
      });
    }

    await appendVersion({
      id: versionId,
      createdAt: new Date().toISOString(),
      success: false,
      error: (error as Error).message
    });

    return res.status(500).json({ success: false, versionId, error: (error as Error).message, rolledBack: true });
  }
});

app.post('/api/config/rollback', async (req, res) => {
  try {
    const payload = req.body as RollbackRequest;
    const records = await readVersions();

    const versionId =
      payload.versionId ||
      [...records]
        .reverse()
        .find((record) => record.success)?.id;

    if (!versionId) {
      return res.status(404).json({ success: false, error: 'no successful version found' });
    }

    const snapshot = await restoreSnapshot(versionId);
    const current = await loadConfigFiles();
    await saveConfigFiles({
      composeYaml: snapshot.compose ?? current.composeYaml,
      prometheusYaml: snapshot.prometheus ?? current.prometheusYaml,
      collectorYaml: snapshot.collector ?? current.collectorYaml,
      tempoYaml: snapshot.tempo ?? current.tempoYaml,
      lokiYaml: snapshot.loki ?? current.lokiYaml,
      alertRulesYaml: snapshot.alertRules ?? current.alertRulesYaml,
      generatedAlertRulesYaml: snapshot.generatedAlerts ?? current.generatedAlertRulesYaml
    });

    await reloadPrometheus();
    await restartServices([...managedContainers]);

    const postRollback = await runPostApplyChecks();
    return res.json({ success: postRollback.healthy, versionId, checks: postRollback.details });
  } catch (error) {
    return res.status(500).json({ success: false, error: (error as Error).message });
  }
});

app.get('/api/alerts', async (_req, res) => {
  try {
    const [baseRaw, generatedRaw] = await Promise.all([
      readTextOrEmpty(managedPaths.alertRules),
      readTextOrEmpty(managedPaths.generatedAlertRules)
    ]);

    const base = parseRuleFile(baseRaw);
    const generated = parseRuleFile(generatedRaw);

    return res.json({
      base,
      generated
    });
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

app.post('/api/alerts', async (req, res) => {
  try {
    const payload = req.body as CreateAlertRequest;
    const rule = buildAlertRule(payload);

    const currentGenerated = await readTextOrEmpty(managedPaths.generatedAlertRules);
    const nextGenerated = appendGeneratedRule(currentGenerated, rule);
    await saveConfigFiles({ generatedAlertRulesYaml: nextGenerated });

    await reloadPrometheus();

    return res.status(201).json({ success: true, rule });
  } catch (error) {
    return res.status(400).json({ success: false, error: (error as Error).message });
  }
});

app.get('/api/rules/raw', async (_req, res) => {
  try {
    const [baseRaw, generatedRaw] = await Promise.all([
      readTextOrEmpty(managedPaths.alertRules),
      readTextOrEmpty(managedPaths.generatedAlertRules)
    ]);
    return res.json({ baseRaw, generatedRaw });
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

app.get('/api/version-history', async (_req, res) => {
  try {
    const records = await readVersions();
    return res.json({ versions: records });
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

app.get('/healthz', (_req, res) => {
  res.status(200).json({ ok: true });
});

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  res.status(500).json({ error: (error as Error).message });
});

app.listen(port, '0.0.0.0', async () => {
  const files = await loadConfigFiles();
  const normalizedPrometheus = yaml.dump(yaml.load(files.prometheusYaml), { lineWidth: 120 });
  if (normalizedPrometheus !== files.prometheusYaml) {
    await saveConfigFiles({ prometheusYaml: normalizedPrometheus });
  }
  console.log(`console-api listening on ${port}`);
});
