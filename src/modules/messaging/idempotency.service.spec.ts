import { describe, expect, it } from '@jest/globals';
import { createMockRedis } from '../../common/testing/mocks.js';
import { IdempotencyService } from './idempotency.service.js';

function setup() {
  const cache = createMockRedis();
  const service = new IdempotencyService(cache as any);
  return { cache, service };
}

describe('IdempotencyService', () => {
  it('returns false (process it) when the messageId is fresh', async () => {
    const { cache, service } = setup();
    cache.setNx.mockResolvedValue(true);

    expect(await service.alreadyProcessed('m1')).toBe(false);
    expect(cache.setNx).toHaveBeenCalledWith('event:m1', '1', 24 * 3600);
  });

  it('returns true (skip it) when the messageId was already seen', async () => {
    const { cache, service } = setup();
    cache.setNx.mockResolvedValue(false);

    expect(await service.alreadyProcessed('m1')).toBe(true);
  });

  it('cannot dedupe a missing messageId and does not touch Redis', async () => {
    const { cache, service } = setup();

    expect(await service.alreadyProcessed(undefined)).toBe(false);
    expect(cache.setNx).not.toHaveBeenCalled();
  });
});
