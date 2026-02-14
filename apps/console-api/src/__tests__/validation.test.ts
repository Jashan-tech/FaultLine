import { describe, expect, it } from 'vitest';
import { validateConfigPair } from '../lib/validation.js';

const prometheusGood = `
rule_files:
  - /etc/prometheus/rules/faultline-alerts.yml
scrape_configs:
  - job_name: otel-collector-exporter
    static_configs:
      - targets: ['otel-collector:8889']
`;

const collectorGood = `
exporters:
  otlphttp/tempo:
    endpoint: http://tempo:4318
service:
  pipelines:
    metrics:
      exporters: [prometheus]
`;

const tempoGood = `
distributor:
  receivers:
    otlp:
      protocols:
        http:
          endpoint: 0.0.0.0:4318
`;

describe('validateConfigPair', () => {
  it('passes valid configuration', () => {
    const result = validateConfigPair(prometheusGood, collectorGood, tempoGood);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('fails when exporter scrape target is missing', () => {
    const result = validateConfigPair('scrape_configs: []\n', collectorGood, tempoGood);
    expect(result.valid).toBe(false);
    expect(result.errors.some((entry) => entry.includes('otel-collector:8889'))).toBe(true);
  });
});
