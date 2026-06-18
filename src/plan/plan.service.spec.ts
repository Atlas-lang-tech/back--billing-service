import { describe, expect, it, jest } from '@jest/globals';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { createMockPrisma, createMockRedis } from '../common/testing/mocks.js';
import { PlanService } from './plan.service.js';

function setup() {
  const db = createMockPrisma();
  const cache = createMockRedis();
  const events = { planUpserted: jest.fn(async () => true) };
  const service = new PlanService(db as any, cache as any, events as any);
  return { db, cache, events, service };
}

const FREE = {
  code: 'FREE',
  name: 'Free',
  maxDictionaries: 2,
  maxWordsPerDict: 100,
  priceCents: 0,
  isActive: true,
};

describe('PlanService', () => {
  it('create persists, invalidates cache and publishes plan.upserted', async () => {
    const { db, cache, events, service } = setup();
    db.plan.findUnique.mockResolvedValue(null);
    db.plan.create.mockResolvedValue(FREE);

    const result = await service.create(FREE);

    expect(result).toEqual(FREE);
    expect(cache.del).toHaveBeenCalledWith('plan:active');
    expect(events.planUpserted).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'FREE', maxDictionaries: 2 }),
    );
  });

  it('create throws Conflict when plan already exists', async () => {
    const { db, service } = setup();
    db.plan.findUnique.mockResolvedValue(FREE);

    await expect(service.create(FREE)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('update throws NotFound for unknown plan', async () => {
    const { db, service } = setup();
    db.plan.findUnique.mockResolvedValue(null);

    await expect(
      service.update('NOPE', { ...FREE } as any),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('findAllActive serves cache when present', async () => {
    const { db, cache, service } = setup();
    cache.get.mockResolvedValue(JSON.stringify([FREE]));

    const result = await service.findAllActive();

    expect(result).toEqual([FREE]);
    expect(db.plan.findMany).not.toHaveBeenCalled();
  });
});
