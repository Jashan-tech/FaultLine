import path from 'node:path';

export const composeDir = process.env.FAULTLINE_COMPOSE_DIR || '/workspace/compose';
export const stateDir = process.env.FAULTLINE_STATE_DIR || '/var/lib/faultline';

export const managedPaths = {
  compose: path.join(composeDir, 'docker-compose.yml'),
  prometheus: path.join(composeDir, 'prometheus', 'prometheus.yml'),
  collector: path.join(composeDir, 'otel', 'collector.yaml'),
  tempo: path.join(composeDir, 'tempo', 'config.yml'),
  alertRules: path.join(composeDir, 'prometheus', 'rules', 'faultline-alerts.yml'),
  generatedAlertRules: path.join(composeDir, 'prometheus', 'rules', 'faultline-generated-alerts.yml'),
  versionsDir: path.join(stateDir, 'versions'),
  versionsMeta: path.join(stateDir, 'versions.json')
};

export const serviceUrls = {
  prometheus: process.env.PROMETHEUS_URL || 'http://prometheus:9090',
  loki: process.env.LOKI_URL || 'http://loki:3100',
  tempo: process.env.TEMPO_URL || 'http://tempo:3200',
  grafana: process.env.GRAFANA_URL || 'http://grafana:3000',
  collectorMetrics: 'http://otel-collector:8888/metrics'
};

export const managedContainers = ['otel-collector', 'prometheus', 'loki', 'tempo', 'grafana'] as const;
