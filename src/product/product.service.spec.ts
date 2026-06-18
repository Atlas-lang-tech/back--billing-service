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

  it('onCourseDeleted deactivates the product', async () => {
    const { db, service } = setup();

    await service.onCourseDeleted({ courseId: 7 }, msg('m2'));

    expect(db.product.updateMany).toHaveBeenCalledWith({
      where: { courseId: 7 },
      data: { isActive: false },
    });
  });
});
