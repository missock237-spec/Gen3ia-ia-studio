import { describe, expect, it } from 'vitest';
import { anticipateFailures } from './failure-anticipation';

describe('failure anticipation', () => {
  it('flags high-risk execution characteristics', () => {
    const result = anticipateFailures({
      steps: [{ id: 'publish', type: 'tool', timeoutMs: 120000, maxRetries: 4, sideEffect: true, requiresApproval: false }],
    });
    expect(result.risks.length).toBeGreaterThan(0);
    expect(result.risks.some((risk: { level: string }) => ['high', 'critical'].includes(risk.level))).toBe(true);
  });

  it('does not report a healthy simple step as critical', () => {
    const result = anticipateFailures({
      steps: [{ id: 'read', type: 'llm', timeoutMs: 30000, maxRetries: 1, sideEffect: false, requiresApproval: false }],
    });
    expect(result.risks.some((risk: { level: string }) => risk.level === 'critical')).toBe(false);
  });
});
