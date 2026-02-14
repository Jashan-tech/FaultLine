import yaml from 'js-yaml';
import type { ValidateResult } from './types.js';

function parseYaml(raw: string, name: string, result: ValidateResult): Record<string, unknown> | undefined {
  try {
    return (yaml.load(raw) as Record<string, unknown>) || {};
  } catch (error) {
    result.errors.push(`${name}: ${(error as Error).message}`);
    return undefined;
  }
}

function includesTarget(prometheus: Record<string, unknown>, target: string): boolean {
  const scrapeConfigs = (prometheus.scrape_configs as Array<Record<string, unknown>> | undefined) || [];
  for (const job of scrapeConfigs) {
    const staticConfigs = (job.static_configs as Array<Record<string, unknown>> | undefined) || [];
    for (const staticConfig of staticConfigs) {
      const targets = (staticConfig.targets as string[] | undefined) || [];
      if (targets.includes(target)) {
        return true;
      }
    }
  }
  return false;
}

export function validateConfigPair(prometheusRaw: string, collectorRaw: string, tempoRaw: string): ValidateResult {
  const result: ValidateResult = { valid: false, errors: [], warnings: [] };

  const prometheus = parseYaml(prometheusRaw, 'prometheus.yml', result);
  const collector = parseYaml(collectorRaw, 'collector.yaml', result);
  const tempo = parseYaml(tempoRaw, 'tempo config', result);

  if (!prometheus || !collector || !tempo) {
    return { ...result, valid: false };
  }

  const metricsPipelineExporters =
    (((collector.service as Record<string, unknown> | undefined)?.pipelines as Record<string, unknown> | undefined)
      ?.metrics as Record<string, unknown> | undefined)?.exporters as string[] | undefined;

  const metricsPipelineEnabled = (metricsPipelineExporters || []).includes('prometheus');
  if (metricsPipelineEnabled && !includesTarget(prometheus, 'otel-collector:8889')) {
    result.errors.push('prometheus.yml must scrape otel-collector:8889 when collector metrics pipeline is enabled');
  }

  const tempoEndpoint =
    (((collector.exporters as Record<string, unknown> | undefined)?.['otlphttp/tempo'] as Record<string, unknown> | undefined)
      ?.endpoint as string | undefined) || '';

  const tempoDistributor = (tempo.distributor as Record<string, unknown> | undefined) || {};
  const tempoReceivers = (tempoDistributor.receivers as Record<string, unknown> | undefined) || {};
  const tempoOtlp = (tempoReceivers.otlp as Record<string, unknown> | undefined) || {};
  const tempoProtocols = (tempoOtlp.protocols as Record<string, unknown> | undefined) || {};
  const tempoHttp = (tempoProtocols.http as Record<string, unknown> | undefined) || {};
  const tempoHttpEndpoint = (tempoHttp.endpoint as string | undefined) || '';

  const normalizedCollectorEndpoint = tempoEndpoint.replace(/^https?:\/\//, '');
  const normalizedTempoReceiver = tempoHttpEndpoint;

  if (!normalizedCollectorEndpoint.startsWith('tempo:')) {
    result.errors.push('collector trace exporter endpoint must target tempo service');
  }

  if (!normalizedCollectorEndpoint.endsWith(':4318')) {
    result.errors.push('collector trace exporter endpoint must use OTLP HTTP port 4318');
  }

  if (normalizedTempoReceiver !== '0.0.0.0:4318') {
    result.errors.push('tempo OTLP HTTP receiver must be enabled on 0.0.0.0:4318');
  }

  result.valid = result.errors.length === 0;
  return result;
}
