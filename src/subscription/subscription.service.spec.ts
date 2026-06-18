import { describe, expect, it, jest } from '@jest/globals';
import type { ConsumeMessage } from 'amqplib';
import { createMockPrisma, createMockRedis } from '../common/testing/mocks.js';
import { SubscriptionService } from './subscription.service.js';

function msg(messageId?: string): ConsumeMessage {
  return { properties: { messageId } } as ConsumeMessage;
}

function setup(processed = false) {
  const db = createMockPrisma();
  const cache = createMockRedis();
  const events = { subscriptionChanged: jest.fn(async () => true) };
  const idempotency = { alreadyProcessed: jest.fn(async () => processed) };
  const service = new SubscriptionService(
    db as any,
    cache as any,
    events as any,
    idempotency as any,
  );
  return { db, cache, events, idempotency, service };
}

describe('SubscriptionService', () => {
  it('onUserRegistered creates FREE sub and publishes subscription.changed', async () => {
    const { db, events, service } = setup();
    db.userSubscription.findUnique.mockResolvedValue(null);

    await service.onUserRegistered({ userId: 'u1' }, msg('m1'));

    expect(db.userSubscription.create).toHaveBeenCalledWith({
      data: { userId: 'u1', planCode: 'FREE' },
    });
    expect(events.subscriptionChanged).toHaveBeenCalledWith({
      userId: 'u1',
      planCode: 'FREE',
    });
  });

  it('onUserRegistered is a no-op when subscription already exists', async () => {
    const { db, events, service } = setup();
    db.userSubscription.findUnique.mockResolvedValue({
      userId: 'u1',
      planCode: 'FREE',
    });

    await service.onUserRegistered({ userId: 'u1' }, msg('m1'));

    expect(db.userSubscription.create).not.toHaveBeenCalled();
    expect(events.subscriptionChanged).not.toHaveBeenCalled();
  });

  it('skips duplicate messageId before touching the DB', async () => {
    const { db, service } = setup(true);

    await service.onUserRegistered({ userId: 'u1' }, msg('m1'));

    expect(db.userSubscription.findUnique).not.toHaveBeenCalled();
  });

  it('grant publishes subscription.changed with the new plan', async () => {
    const { db, events, service } = setup();
    db.plan.findUnique.mockResolvedValue({ code: 'PRO' });
    db.userSubscription.upsert.mockResolvedValue({
      userId: 'u1',
      planCode: 'PRO',
    });

    await service.grant('u1', { planCode: 'PRO' });

    expect(events.subscriptionChanged).toHaveBeenCalledWith({
      userId: 'u1',
      planCode: 'PRO',
    });
  });
});
