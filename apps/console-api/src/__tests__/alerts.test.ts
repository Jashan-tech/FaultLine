import { describe, expect, it } from 'vitest';
import { appendGeneratedRule, buildAlertRule, parseRuleFile } from '../lib/alerts.js';

describe('alert generation', () => {
  it('creates rule templates', () => {
    const rule = buildAlertRule({ template: 'service_down', service: 'api' });
    expect(rule.alert).toContain('api');
    expect(rule.expr).toContain('up{service="api"} == 0');
  });

  it('appends generated rule to group', () => {
    const next = appendGeneratedRule('', buildAlertRule({ template: 'high_error_rate', service: 'checkout' }));
    const parsed = parseRuleFile(next);
    expect(parsed.groups.length).toBe(1);
    expect(parsed.groups[0].name).toBe('faultline.generated');
    expect(parsed.groups[0].rules.length).toBe(1);
  });
});
