import { describe, expect, it } from 'vitest';
import { appendGeneratedRule, buildAlertRule, parseRuleFile } from '../lib/alerts.js';

describe('alert generation', () => {
  it('creates service down rule', () => {
    const rule = buildAlertRule({ template: 'service_down', service: 'api', threshold: 0, duration: '2m' });
    expect(rule.alert).toContain('api');
    expect(rule.expr).toContain('up{job="api"}');
  });

  it('creates host profile templates', () => {
    const cpu = buildAlertRule({ template: 'high_cpu', service: 'node-exporter', threshold: 85, duration: '5m' });
    const memory = buildAlertRule({ template: 'high_memory', service: 'node-exporter', threshold: 90, duration: '5m' });

    expect(cpu.expr).toContain('node_cpu_seconds_total');
    expect(memory.expr).toContain('node_memory_MemTotal_bytes');
  });

  it('appends generated rule to group', () => {
    const next = appendGeneratedRule(
      '',
      buildAlertRule({ template: 'high_error_rate', service: 'checkout', threshold: 0.05, duration: '5m' })
    );
    const parsed = parseRuleFile(next);
    expect(parsed.groups.length).toBe(1);
    expect(parsed.groups[0].name).toBe('faultline.generated');
    expect(parsed.groups[0].rules.length).toBe(1);
  });
});
