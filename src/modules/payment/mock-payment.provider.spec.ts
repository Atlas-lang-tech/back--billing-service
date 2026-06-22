import { describe, expect, it } from '@jest/globals';
import { MockPaymentProvider } from './mock-payment.provider.js';

describe('MockPaymentProvider', () => {
  it('always succeeds and returns a mock reference', async () => {
    const provider = new MockPaymentProvider();

    const result = await provider.charge({
      userId: 'u1',
      amountCents: 500,
      currency: 'USD',
      reference: 'course:1',
    });

    expect(result.ok).toBe(true);
    expect(result.ref).toMatch(/^mock_/);
  });
});
