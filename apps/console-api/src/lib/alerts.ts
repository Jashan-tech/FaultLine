import yaml from 'js-yaml';
import type { CreateAlertRequest } from './types.js';

type Rule = {
  alert: string;
  expr: string;
  for: string;
  labels: Record<string, string>;
  annotations: Record<string, string>;
};

type RuleGroup = {
  name: string;
  rules: Rule[];
};

type RuleFile = {
  groups: RuleGroup[];
};

function sanitize(name: string): string {
  return name.replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_+|_+$/g, '').toLowerCase();
}

export function parseRuleFile(raw: string): RuleFile {
  if (!raw.trim()) {
    return { groups: [] };
  }
  return (yaml.load(raw) as RuleFile) || { groups: [] };
}

export function dumpRuleFile(ruleFile: RuleFile): string {
  return yaml.dump(ruleFile, { lineWidth: 120 });
}

export function buildAlertRule(input: CreateAlertRequest): Rule {
  const service = input.service.trim();
  const duration = input.duration || '5m';

  if (!service) {
    throw new Error('service is required');
  }

  switch (input.template) {
    case 'high_error_rate': {
      const threshold = input.threshold ?? 0.05;
      return {
        alert: `${sanitize(service)}_high_error_rate`,
        expr: `sum(rate(http_requests_total{service="${service}",status_code=~"5..|4.."}[5m])) / sum(rate(http_requests_total{service="${service}"}[5m])) > ${threshold}`,
        for: duration,
        labels: { severity: 'warning' },
        annotations: {
          summary: `High error rate for ${service}`,
          description: `Error ratio exceeded ${threshold} for ${duration}`
        }
      };
    }
    case 'high_latency_p95': {
      const threshold = input.threshold ?? 1;
      return {
        alert: `${sanitize(service)}_high_latency_p95`,
        expr: `histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket{service="${service}"}[5m])) by (le)) > ${threshold}`,
        for: duration,
        labels: { severity: 'warning' },
        annotations: {
          summary: `High latency for ${service}`,
          description: `P95 latency exceeded ${threshold}s for ${duration}`
        }
      };
    }
    case 'service_down':
      return {
        alert: `${sanitize(service)}_service_down`,
        expr: `up{service="${service}"} == 0`,
        for: duration,
        labels: { severity: 'critical' },
        annotations: {
          summary: `${service} is down`,
          description: `${service} has been unreachable for ${duration}`
        }
      };
    default:
      throw new Error(`unsupported template: ${String(input.template)}`);
  }
}

export function appendGeneratedRule(raw: string, rule: Rule): string {
  const ruleFile = parseRuleFile(raw);
  let group = ruleFile.groups.find((entry) => entry.name === 'faultline.generated');
  if (!group) {
    group = { name: 'faultline.generated', rules: [] };
    ruleFile.groups.push(group);
  }

  group.rules = group.rules.filter((entry) => entry.alert !== rule.alert);
  group.rules.push(rule);

  return dumpRuleFile(ruleFile);
}
