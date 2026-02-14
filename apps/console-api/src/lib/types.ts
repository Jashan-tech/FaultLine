export type ConfigFiles = {
  composeYaml: string;
  prometheusYaml: string;
  collectorYaml: string;
  tempoYaml: string;
  lokiYaml: string;
  alertRulesYaml: string;
  generatedAlertRulesYaml: string;
};

export type SimpleConfigModel = {
  enableDbProfile: boolean;
  enableHostProfile: boolean;
  addScrapeTarget: string;
  prometheusRetention: string;
  metricsPipelineEnabled: boolean;
};

export type ValidateResult = {
  valid: boolean;
  errors: string[];
  warnings: string[];
};

export type VersionRecord = {
  id: string;
  createdAt: string;
  success: boolean;
  error?: string;
};

export type ApplyRequest = {
  simple?: Partial<SimpleConfigModel>;
  raw?: {
    collectorYaml?: string;
    prometheusYaml?: string;
    tempoYaml?: string;
    lokiYaml?: string;
  };
};

export type RollbackRequest = {
  versionId?: string;
};

export type AlertTemplate =
  | 'high_error_rate'
  | 'high_latency_p95'
  | 'service_down'
  | 'high_cpu'
  | 'high_memory';

export type CreateAlertRequest = {
  template: AlertTemplate;
  service: string;
  threshold: number;
  duration: string;
};
