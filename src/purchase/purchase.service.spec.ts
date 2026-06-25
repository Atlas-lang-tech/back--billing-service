import { describe, expect, it, jest } from '@jest/globals';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { createMockPrisma } from '../common/testing/mocks.js';
import { PurchaseService } from './purchase.service.js';

function setup(chargeOk = true) {
  const db = createMockPrisma();
  const payment = {
    charge: jest.fn(async () => ({ ok: chargeOk, ref: 'r1' })),
  };
  const events = {
    coursePurchased: jest.fn(async () => true),
    paymentSucceeded: jest.fn(async () => true),
  };
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
    // Без email у контексті лист-квитанцію не шлемо
    expect(events.paymentSucceeded).not.toHaveBeenCalled();
    expect(result.id).toBe(1);
  });

  it('publishes billing.payment_succeeded when the user email is known', async () => {
    const { db, events, service } = setup();
    db.product.findUnique.mockResolvedValue(PAID_PRODUCT);
    db.coursePurchase.findUnique.mockResolvedValue(null);
    const purchasedAt = new Date('2026-01-01T00:00:00.000Z');
    db.coursePurchase.create.mockResolvedValue({
      id: 42,
      userId: 'u1',
      courseId: 1,
      priceCents: 500,
      purchasedAt,
    });

    await service.purchaseCourse(
      { id: 'u1', role: 'USER', plan: 'FREE', email: 'buyer@example.com' },
      1,
    );

    expect(events.paymentSucceeded).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'u1',
        email: 'buyer@example.com',
        amount: 5,
        currency: 'USD',
        invoiceNumber: '42',
        paidAt: purchasedAt.toISOString(),
      }),
    );
    // eventId — валідний UUID
    const arg = (events.paymentSucceeded as jest.Mock).mock.calls[0][0] as {
      eventId: string;
    };
    expect(arg.eventId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
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

  it('throws NotFound when the course is missing or inactive', async () => {
    const { db, service } = setup();
    db.product.findUnique.mockResolvedValue({ ...PAID_PRODUCT, isActive: false });

    await expect(service.purchaseCourse(USER, 1)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('throws BadRequest for a free course', async () => {
    const { db, service } = setup();
    db.product.findUnique.mockResolvedValue({ ...PAID_PRODUCT, isFree: true });

    await expect(service.purchaseCourse(USER, 1)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('throws BadRequest when the course is not priced yet', async () => {
    const { db, service } = setup();
    db.product.findUnique.mockResolvedValue({
      ...PAID_PRODUCT,
      priceCents: null,
    });

    await expect(service.purchaseCourse(USER, 1)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('throws BadRequest and records nothing when payment fails', async () => {
    const { db, events, service } = setup(false);
    db.product.findUnique.mockResolvedValue(PAID_PRODUCT);
    db.coursePurchase.findUnique.mockResolvedValue(null);

    await expect(service.purchaseCourse(USER, 1)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(db.coursePurchase.create).not.toHaveBeenCalled();
    expect(events.coursePurchased).not.toHaveBeenCalled();
  });

  it('myPurchases lists the user own purchases', async () => {
    const { db, service } = setup();
    const purchases = [{ id: 1, userId: 'u1', courseId: 1 }];
    db.coursePurchase.findMany.mockResolvedValue(purchases);

    const result = await service.myPurchases('u1');

    expect(result).toEqual(purchases);
    expect(db.coursePurchase.findMany).toHaveBeenCalledWith({
      where: { userId: 'u1' },
    });
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
