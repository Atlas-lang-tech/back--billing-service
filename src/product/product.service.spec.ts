import { describe, expect, it, jest } from '@jest/globals';
import { NotFoundException } from '@nestjs/common';
import type { ConsumeMessage } from 'amqplib';
import { createMockPrisma, createMockRedis } from '../common/testing/mocks.js';
import { ProductService } from './product.service.js';

function msg(messageId?: string): ConsumeMessage {
  return { properties: { messageId } } as ConsumeMessage;
}

function setup(processed = false) {
  const db = createMockPrisma();
  const cache = createMockRedis();
  const idempotency = { alreadyProcessed: jest.fn(async () => processed) };
  const service = new ProductService(
    db as any,
    cache as any,
    idempotency as any,
  );
  return { db, cache, idempotency, service };
}

describe('ProductService', () => {
  it('onCourseUpserted upserts a draft product', async () => {
    const { db, service } = setup();

    await service.onCourseUpserted(
      { courseId: 1, isFree: false, title: 'A' },
      msg('m1'),
    );

    expect(db.product.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { courseId: 1 },
        create: expect.objectContaining({ courseId: 1, isActive: false }),
      }),
    );
  });

  it('skips duplicate messageId', async () => {
    const { db, service } = setup(true);

    await service.onCourseUpserted(
      { courseId: 1, isFree: false, title: 'A' },
      msg('m1'),
    );

    expect(db.product.upsert).not.toHaveBeenCalled();
  });

  it('findOne returns an active product (cache-aside)', async () => {
    const { db, cache, service } = setup();
    cache.get.mockResolvedValue(null);
    const product = { courseId: 1, title: 'A', isActive: true };
    db.product.findFirst.mockResolvedValue(product);

    const result = await service.findOne(1);

    expect(result).toEqual(product);
    expect(db.product.findFirst).toHaveBeenCalledWith({
      where: { courseId: 1, isActive: true },
    });
    expect(cache.set).toHaveBeenCalled();
  });

  it('findOne throws NotFound for a missing/inactive product', async () => {
    const { db, cache, service } = setup();
    cache.get.mockResolvedValue(null);
    db.product.findFirst.mockResolvedValue(null);

    await expect(service.findOne(99)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('findAllActive serves cache when present', async () => {
    const { db, cache, service } = setup();
    const products = [{ courseId: 1, isActive: true }];
    cache.get.mockResolvedValue(JSON.stringify(products));

    const result = await service.findAllActive();

    expect(result).toEqual(products);
    expect(db.product.findMany).not.toHaveBeenCalled();
  });

  it('findAllActive falls through to the DB and caches on a miss', async () => {
    const { db, cache, service } = setup();
    cache.get.mockResolvedValue(null);
    const products = [{ courseId: 1, isActive: true }];
    db.product.findMany.mockResolvedValue(products);

    const result = await service.findAllActive();

    expect(result).toEqual(products);
    expect(db.product.findMany).toHaveBeenCalledWith({
      where: { isActive: true },
    });
    expect(cache.set).toHaveBeenCalledWith(
      'product:active',
      JSON.stringify(products),
      3600,
    );
  });

  it('setPrice updates the product and invalidates cache', async () => {
    const { db, cache, service } = setup();
    const existing = { courseId: 1, currency: 'USD', priceCents: null };
    db.product.findUnique.mockResolvedValue(existing);
    db.product.update.mockResolvedValue({ ...existing, priceCents: 700 });

    const result = await service.setPrice(1, { priceCents: 700 } as any);

    expect(result.priceCents).toBe(700);
    expect(db.product.update).toHaveBeenCalledWith({
      where: { courseId: 1 },
      // currency falls back to the existing value; isActive defaults to true.
      data: { priceCents: 700, currency: 'USD', isActive: true },
    });
    expect(cache.del).toHaveBeenCalledWith('product:active');
    expect(cache.del).toHaveBeenCalledWith('product:1');
  });

  it('setPrice throws NotFound for an unknown product', async () => {
    const { db, service } = setup();
    db.product.findUnique.mockResolvedValue(null);

    await expect(
      service.setPrice(99, { priceCents: 100 } as any),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(db.product.update).not.toHaveBeenCalled();
  });

  it('onCourseDeleted deactivates the product', async () => {
    const { db, service } = setup();

    await service.onCourseDeleted({ courseId: 7 }, msg('m2'));

    expect(db.product.updateMany).toHaveBeenCalledWith({
      where: { courseId: 7 },
      data: { isActive: false },
    });
  });
});
