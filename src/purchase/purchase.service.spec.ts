import { describe, expect, it, jest } from '@jest/globals';
import { ConflictException } from '@nestjs/common';
import { createMockPrisma } from '../common/testing/mocks.js';
import { PurchaseService } from './purchase.service.js';

function setup(chargeOk = true) {
  const db = createMockPrisma();
  const payment = {
    charge: jest.fn(async () => ({ ok: chargeOk, ref: 'r1' })),
  };
  const events = { coursePurchased: jest.fn(async () => true) };
  const service = new PurchaseService(db as any, payment as any, events as any);
  return { db, payment, events, service };
}

const USER = { id: 'u1', role: 'USER' };
const PAID_PRODUCT = {
  courseId: 1,
  title: 'A',
  priceCents: 500,
  currency: 'USD',
  isFree: false,
  isActive: true,
};

describe('PurchaseService', () => {
  it('purchaseCourse charges, records and publishes course.purchased', async () => {
    const { db, payment, events, service } = setup();
    db.product.findUnique.mockResolvedValue(PAID_PRODUCT);
    db.coursePurchase.findUnique.mockResolvedValue(null);
    const purchasedAt = new Date('2026-01-01T00:00:00.000Z');
    db.coursePurchase.create.mockResolvedValue({
      id: 1,
      userId: 'u1',
      courseId: 1,
      priceCents: 500,
      purchasedAt,
    });

    const result = await service.purchaseCourse(USER, 1);

    expect(payment.charge).toHaveBeenCalledWith(
      expect.objectContaining({ amountCents: 500, reference: 'course:1' }),
    );
    expect(events.coursePurchased).toHaveBeenCalledWith({
      userId: 'u1',
      courseId: 1,
      purchasedAt: purchasedAt.toISOString(),
    });
    expect(result.id).toBe(1);
  });

  it('throws Conflict when the course is already owned', async () => {
    const { db, payment, service } = setup();
    db.product.findUnique.mockResolvedValue(PAID_PRODUCT);
    db.coursePurchase.findUnique.mockResolvedValue({ id: 9 });

    await expect(service.purchaseCourse(USER, 1)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(payment.charge).not.toHaveBeenCalled();
  });

  it('access: admin always has access', async () => {
    const { db, service } = setup();
    const result = await service.access({ id: 'a', role: 'ADMIN' }, 1);
    expect(result.hasAccess).toBe(true);
    expect(db.product.findUnique).not.toHaveBeenCalled();
  });

  it('access: free course is accessible', async () => {
    const { db, service } = setup();
    db.product.findUnique.mockResolvedValue({ ...PAID_PRODUCT, isFree: true });
    const result = await service.access(USER, 1);
    expect(result.hasAccess).toBe(true);
  });

  it('access: paid course requires a purchase', async () => {
    const { db, service } = setup();
    db.product.findUnique.mockResolvedValue(PAID_PRODUCT);
    db.coursePurchase.findUnique.mockResolvedValue(null);
    const denied = await service.access(USER, 1);
    expect(denied.hasAccess).toBe(false);

    db.coursePurchase.findUnique.mockResolvedValue({ id: 1 });
    const granted = await service.access(USER, 1);
    expect(granted.hasAccess).toBe(true);
  });
});
