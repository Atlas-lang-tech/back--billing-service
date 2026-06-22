import { describe, expect, it, jest } from '@jest/globals';
import { EventPublisher } from './event-publisher.service.js';
import { EVENTS_EXCHANGE, RoutingKey } from './messaging.constants.js';

function setup() {
  const amqp = { publish: jest.fn(async () => true) };
  const service = new EventPublisher(amqp as any);
  return { amqp, service };
}

const PUBLISH_OPTS = expect.objectContaining({
  persistent: true,
  contentType: 'application/json',
  messageId: expect.any(String),
});

describe('EventPublisher', () => {
  it('publishes subscription.changed to the events exchange', async () => {
    const { amqp, service } = setup();
    const event = { userId: 'u1', planCode: 'PRO' };

    await service.subscriptionChanged(event);

    expect(amqp.publish).toHaveBeenCalledWith(
      EVENTS_EXCHANGE,
      RoutingKey.SubscriptionChanged,
      event,
      PUBLISH_OPTS,
    );
  });

  it('publishes plan.upserted to the events exchange', async () => {
    const { amqp, service } = setup();
    const event = {
      code: 'PRO',
      maxDictionaries: 10,
      maxWordsPerDict: 1000,
      priceCents: 999,
    };

    await service.planUpserted(event);

    expect(amqp.publish).toHaveBeenCalledWith(
      EVENTS_EXCHANGE,
      RoutingKey.PlanUpserted,
      event,
      PUBLISH_OPTS,
    );
  });

  it('publishes course.purchased to the events exchange', async () => {
    const { amqp, service } = setup();
    const event = {
      userId: 'u1',
      courseId: 1,
      purchasedAt: '2026-01-01T00:00:00.000Z',
    };

    await service.coursePurchased(event);

    expect(amqp.publish).toHaveBeenCalledWith(
      EVENTS_EXCHANGE,
      RoutingKey.CoursePurchased,
      event,
      PUBLISH_OPTS,
    );
  });

  it('tags each message with a unique messageId', async () => {
    const { amqp, service } = setup();

    await service.planUpserted({
      code: 'A',
      maxDictionaries: 1,
      maxWordsPerDict: 1,
      priceCents: 0,
    });
    await service.planUpserted({
      code: 'B',
      maxDictionaries: 1,
      maxWordsPerDict: 1,
      priceCents: 0,
    });

    const first = amqp.publish.mock.calls[0][3] as { messageId: string };
    const second = amqp.publish.mock.calls[1][3] as { messageId: string };
    expect(first.messageId).not.toBe(second.messageId);
  });
});
