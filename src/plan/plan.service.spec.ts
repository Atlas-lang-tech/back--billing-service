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

  it('setActive flips the flag, invalidates cache and publishes plan.upserted', async () => {
    const { db, cache, events, service } = setup();
    db.plan.findUnique.mockResolvedValue(FREE);
    db.plan.update.mockResolvedValue({ ...FREE, isActive: false });

    const result = await service.setActive('FREE', false);

    expect(result.isActive).toBe(false);
    expect(db.plan.update).toHaveBeenCalledWith({
      where: { code: 'FREE' },
      data: { isActive: false },
    });
    expect(cache.del).toHaveBeenCalledWith('plan:active');
    expect(events.planUpserted).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'FREE' }),
    );
  });

  it('setActive throws NotFound for unknown plan', async () => {
    const { db, service } = setup();
    db.plan.findUnique.mockResolvedValue(null);

    await expect(service.setActive('NOPE', true)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('update persists, invalidates cache and publishes plan.upserted', async () => {
    const { db, cache, events, service } = setup();
    const updated = { ...FREE, priceCents: 999 };
    db.plan.findUnique.mockResolvedValue(FREE);
    db.plan.update.mockResolvedValue(updated);

    const result = await service.update('FREE', updated as any);

    expect(result).toEqual(updated);
    expect(db.plan.update).toHaveBeenCalledWith({
      where: { code: 'FREE' },
      data: updated,
    });
    expect(cache.del).toHaveBeenCalledWith('plan:active');
    expect(cache.del).toHaveBeenCalledWith('plan:FREE');
    expect(events.planUpserted).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'FREE', priceCents: 999 }),
    );
  });

  it('delete removes the plan and invalidates cache', async () => {
    const { db, cache, service } = setup();
    db.plan.findUnique.mockResolvedValue(FREE);

    await service.delete('FREE');

    expect(db.plan.delete).toHaveBeenCalledWith({ where: { code: 'FREE' } });
    expect(cache.del).toHaveBeenCalledWith('plan:active');
    expect(cache.del).toHaveBeenCalledWith('plan:FREE');
  });

  it('delete throws NotFound for unknown plan', async () => {
    const { db, service } = setup();
    db.plan.findUnique.mockResolvedValue(null);

    await expect(service.delete('NOPE')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(db.plan.delete).not.toHaveBeenCalled();
  });

  it('findAll returns every plan, active or not, bypassing the cache', async () => {
    const { db, cache, service } = setup();
    const hidden = { ...FREE, code: 'PRO', isActive: false };
    db.plan.findMany.mockResolvedValue([FREE, hidden]);

    const result = await service.findAll();

    expect(result).toEqual([FREE, hidden]);
    expect(db.plan.findMany).toHaveBeenCalledWith();
    expect(cache.get).not.toHaveBeenCalled();
  });

  it('findAllActive serves cache when present', async () => {
    const { db, cache, service } = setup();
    cache.get.mockResolvedValue(JSON.stringify([FREE]));

    const result = await service.findAllActive();

    expect(result).toEqual([FREE]);
    expect(db.plan.findMany).not.toHaveBeenCalled();
  });

  it('findAllActive falls through to the DB and caches on a miss', async () => {
    const { db, cache, service } = setup();
    cache.get.mockResolvedValue(null);
    db.plan.findMany.mockResolvedValue([FREE]);

    const result = await service.findAllActive();

    expect(result).toEqual([FREE]);
    expect(db.plan.findMany).toHaveBeenCalledWith({
      where: { isActive: true },
    });
    expect(cache.set).toHaveBeenCalledWith(
      'plan:active',
      JSON.stringify([FREE]),
      3600,
    );
  });
});
