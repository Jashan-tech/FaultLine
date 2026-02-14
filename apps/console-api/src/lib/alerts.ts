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

function scopedRate(metric: string, service: string, extra = ''): string {
  const suffix = extra ? `,${extra}` : '';
  return `rate(${metric}{job="${service}"${suffix}}[5m]) or rate(${metric}{service="${service}"${suffix}}[5m])`;
}

export function parseRuleFile(raw: string): RuleFile {
  if (!raw.trim()) {
    return { groups: [] };
  }

  const parsed = yaml.load(raw) as RuleFile | null;
  if (!parsed || !Array.isArray(parsed.groups)) {
    return { groups: [] };
  }

  return parsed;
}

export function dumpRuleFile(ruleFile: RuleFile): string {
  return yaml.dump(ruleFile, { lineWidth: 120 });
}

export function buildAlertRule(input: CreateAlertRequest): Rule {
  const service = input.service.trim();
  const duration = input.duration?.trim() || '5m';

  if (!service) {
    throw new Error('service is required');
  }

  if (!Number.isFinite(input.threshold)) {
    throw new Error('threshold must be a number');
  }

  switch (input.template) {
    case 'high_error_rate': {
      const threshold = input.threshold;
      return {
        alert: `${sanitize(service)}_high_error_rate`,
        expr: `sum(${scopedRate('http_requests_total', service, 'status_code=~"5..|4.."')}) / sum(${scopedRate('http_requests_total', service)}) > ${threshold}`,
        for: duration,
        labels: { severity: 'warning' },
        annotations: {
          summary: `High error rate for ${service}`,
          description: `Error ratio exceeded ${threshold} for ${duration}`
        }
      };
    }

    case 'high_latency_p95': {
      const threshold = input.threshold;
      return {
        alert: `${sanitize(service)}_high_latency_p95`,
        expr: `histogram_quantile(0.95, sum(${scopedRate('http_request_duration_seconds_bucket', service)}) by (le)) > ${threshold}`,
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
        expr: `sum(up{job="${service}"} or up{service="${service}"}) == 0`,
        for: duration,
        labels: { severity: 'critical' },
        annotations: {
          summary: `${service} is down`,
          description: `${service} has been unreachable for ${duration}`
        }
      };

    case 'high_cpu': {
      const threshold = input.threshold;
      return {
        alert: `${sanitize(service)}_high_cpu`,
        expr: `100 - (avg by (instance) (irate(node_cpu_seconds_total{mode="idle"}[5m])) * 100) > ${threshold}`,
        for: duration,
        labels: { severity: 'warning' },
        annotations: {
          summary: 'High CPU usage detected',
          description: `CPU usage above ${threshold}% for ${duration}`
        }
      };
    }

    case 'high_memory': {
      const threshold = input.threshold;
      return {
        alert: `${sanitize(service)}_high_memory`,
        expr: `(node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes) / node_memory_MemTotal_bytes * 100 > ${threshold}`,
        for: duration,
        labels: { severity: 'warning' },
        annotations: {
          summary: 'High memory usage detected',
          description: `Memory usage above ${threshold}% for ${duration}`
        }
      };
    }

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
