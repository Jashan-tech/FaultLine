import { describe, expect, it } from 'vitest';
import { deriveServiceCandidates } from '../lib/signals.js';

describe('service candidate discovery', () => {
  it('collects service names from job and service labels', () => {
    const candidates = deriveServiceCandidates([
      { labels: { job: 'example-node', service: 'node-express-example' } },
      { labels: { job: 'prometheus' } },
      { discoveredLabels: { job: 'grafana' } }
    ]);

    expect(candidates).toContain('node-express-example');
    expect(candidates).toContain('example-node');
    expect(candidates).toContain('prometheus');
    expect(candidates).toContain('grafana');
  });
});
