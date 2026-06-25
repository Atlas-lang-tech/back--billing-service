import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import {
  CoursePurchasedEvent,
  EVENTS_EXCHANGE,
  PaymentSucceededEvent,
  PlanUpsertedEvent,
  RoutingKey,
  SubscriptionChangedEvent,
} from './messaging.constants.js';

/**
 * Publishes billing's domain events to the `atlas.events` topic exchange.
 * Every message is persistent and carries a unique `messageId` so consumers
 * can dedupe.
 */
@Injectable()
export class EventPublisher {
  constructor(private readonly amqp: AmqpConnection) {}

  private publish(routingKey: string, payload: unknown): Promise<boolean> {
    return this.amqp.publish(EVENTS_EXCHANGE, routingKey, payload, {
      persistent: true,
      messageId: randomUUID(),
      contentType: 'application/json',
    });
  }

  subscriptionChanged(event: SubscriptionChangedEvent): Promise<boolean> {
    return this.publish(RoutingKey.SubscriptionChanged, event);
  }

  planUpserted(event: PlanUpsertedEvent): Promise<boolean> {
    return this.publish(RoutingKey.PlanUpserted, event);
  }

  coursePurchased(event: CoursePurchasedEvent): Promise<boolean> {
    return this.publish(RoutingKey.CoursePurchased, event);
  }

  paymentSucceeded(event: PaymentSucceededEvent): Promise<boolean> {
    return this.publish(RoutingKey.PaymentSucceeded, event);
  }
}
