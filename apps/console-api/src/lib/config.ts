import yaml from 'js-yaml';
import { readTextOrEmpty, writeFileAtomic } from './files.js';
import { managedPaths } from './paths.js';
import type { ConfigFiles, SimpleConfigModel } from './types.js';
import { isContainerRunning } from './docker-control.js';

function parseYaml<T>(raw: string): T {
  return (yaml.load(raw) as T) || ({} as T);
}

function ensureGeneratedRulesIncluded(prometheusRaw: string): string {
  const parsed = parseYaml<Record<string, unknown>>(prometheusRaw);
  const ruleFiles = (parsed.rule_files as string[] | undefined) || [];
  const generatedPath = '/etc/prometheus/rules/faultline-generated-alerts.yml';
  if (!ruleFiles.includes(generatedPath)) {
    ruleFiles.push(generatedPath);
    parsed.rule_files = ruleFiles;
  }
  return yaml.dump(parsed, { lineWidth: 120 });
}

function applyRetention(composeRaw: string, retention: string): string {
  const parsed = parseYaml<Record<string, unknown>>(composeRaw);
  const services = (parsed.services as Record<string, Record<string, unknown>> | undefined) || {};
  const prometheus = services.prometheus;
  if (!prometheus) {
    return composeRaw;
  }

  const command = (prometheus.command as string[] | undefined) || [];
  const nextCommand = command.filter((entry) => !entry.startsWith('--storage.tsdb.retention.time='));
  nextCommand.push(`--storage.tsdb.retention.time=${retention}`);
  prometheus.command = nextCommand;
  services.prometheus = prometheus;
  parsed.services = services;
  return yaml.dump(parsed, { lineWidth: 120 });
}

function collectAdditionalTargets(prometheusRaw: string): string[] {
  const parsed = parseYaml<Record<string, unknown>>(prometheusRaw);
  const scrapeConfigs = (parsed.scrape_configs as Array<Record<string, unknown>> | undefined) || [];
  const defaults = new Set([
    'localhost:9090',
    'otel-collector:8888',
    'otel-collector:8889',
    'node-exporter:9100',
    'postgres-exporter:9187',
    'redis-exporter:9121',
    'host.docker.internal:3001'
  ]);

  const found = new Set<string>();
  for (const job of scrapeConfigs) {
    const staticConfigs = (job.static_configs as Array<Record<string, unknown>> | undefined) || [];
    for (const staticConfig of staticConfigs) {
      const targets = (staticConfig.targets as string[] | undefined) || [];
      for (const target of targets) {
        if (!defaults.has(target)) {
          found.add(target);
        }
      }
    }
  }

  return Array.from(found).sort();
}

function addScrapeTarget(prometheusRaw: string, target: string): string {
  if (!target.trim()) {
    return prometheusRaw;
  }

  const parsed = parseYaml<Record<string, unknown>>(prometheusRaw);
  const scrapeConfigs = (parsed.scrape_configs as Array<Record<string, unknown>> | undefined) || [];
  const existing = scrapeConfigs.some((job) => {
    const staticConfigs = (job.static_configs as Array<Record<string, unknown>> | undefined) || [];
    return staticConfigs.some((staticConfig) => ((staticConfig.targets as string[] | undefined) || []).includes(target));
  });

  if (!existing) {
    scrapeConfigs.push({
      job_name: `custom-${target.replace(/[^a-zA-Z0-9]+/g, '-')}`,
      static_configs: [{ targets: [target] }],
      scrape_interval: '15s',
      scrape_timeout: '10s'
    });
  }

  parsed.scrape_configs = scrapeConfigs;
  return yaml.dump(parsed, { lineWidth: 120 });
}

export async function loadConfigFiles(): Promise<ConfigFiles> {
  const [composeYaml, prometheusYamlRaw, collectorYaml, tempoYaml, alertRulesYaml, generatedAlertRulesYaml] = await Promise.all([
    readTextOrEmpty(managedPaths.compose),
    readTextOrEmpty(managedPaths.prometheus),
    readTextOrEmpty(managedPaths.collector),
    readTextOrEmpty(managedPaths.tempo),
    readTextOrEmpty(managedPaths.alertRules),
    readTextOrEmpty(managedPaths.generatedAlertRules)
  ]);

  return {
    composeYaml,
    prometheusYaml: ensureGeneratedRulesIncluded(prometheusYamlRaw),
    collectorYaml,
    tempoYaml,
    alertRulesYaml,
    generatedAlertRulesYaml
  };
}

export async function saveConfigFiles(config: Partial<ConfigFiles>): Promise<void> {
  const writes: Promise<void>[] = [];
  if (config.composeYaml !== undefined) {
    writes.push(writeFileAtomic(managedPaths.compose, config.composeYaml));
  }
  if (config.prometheusYaml !== undefined) {
    writes.push(writeFileAtomic(managedPaths.prometheus, config.prometheusYaml));
  }
  if (config.collectorYaml !== undefined) {
    writes.push(writeFileAtomic(managedPaths.collector, config.collectorYaml));
  }
  if (config.generatedAlertRulesYaml !== undefined) {
    writes.push(writeFileAtomic(managedPaths.generatedAlertRules, config.generatedAlertRulesYaml));
  }
  await Promise.all(writes);
}

export async function buildSimpleConfigModel(files: ConfigFiles): Promise<SimpleConfigModel> {
  const retentionMatch = files.composeYaml.match(/--storage\.tsdb\.retention\.time=([^\s'"\]]+)/);
  const enableDbProfile = await isContainerRunning('postgres');
  const enableHostProfile = await isContainerRunning('node-exporter');

  const collector = parseYaml<Record<string, unknown>>(files.collectorYaml);
  const metricsPipelineExporters =
    (((collector.service as Record<string, unknown> | undefined)?.pipelines as Record<string, unknown> | undefined)
      ?.metrics as Record<string, unknown> | undefined)?.exporters as string[] | undefined;

  return {
    enableDbProfile,
    enableHostProfile,
    addScrapeTarget: collectAdditionalTargets(files.prometheusYaml).join(', '),
    prometheusRetention: retentionMatch?.[1] || '200h',
    metricsPipelineEnabled: (metricsPipelineExporters || []).includes('prometheus')
  };
}

export function applySimpleConfig(files: ConfigFiles, simple: Partial<SimpleConfigModel>): ConfigFiles {
  let composeYaml = files.composeYaml;
  let prometheusYaml = files.prometheusYaml;

  if (simple.prometheusRetention) {
    composeYaml = applyRetention(composeYaml, simple.prometheusRetention);
  }

  if (simple.addScrapeTarget) {
    const targets = simple.addScrapeTarget
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean);

    for (const target of targets) {
      prometheusYaml = addScrapeTarget(prometheusYaml, target);
    }
  }

  return {
    ...files,
    composeYaml,
    prometheusYaml: ensureGeneratedRulesIncluded(prometheusYaml)
  };
}
