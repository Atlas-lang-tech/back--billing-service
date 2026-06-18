import { RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { ConsumeMessage } from 'amqplib';
import { subscriptionStatus } from '../../generated/prisma/enums.js';
import { EventPublisher } from '../modules/messaging/event-publisher.service.js';
import { IdempotencyService } from '../modules/messaging/idempotency.service.js';
import {
  EVENTS_DLX,
  EVENTS_EXCHANGE,
  RoutingKey,
  type UserRegisteredEvent,
} from '../modules/messaging/messaging.constants.js';
import { PrismaService } from '../modules/Prisma/prisma.service.js';
import { RedisService } from '../modules/redis/redis.service.js';
import { GrantSubscriptionDto } from './dto/grant-subscription.dto.js';

const FREE_PLAN = 'FREE';

@Injectable()
export class SubscriptionService {
  private readonly logger = new Logger(SubscriptionService.name);

  constructor(
    private db: PrismaService,
    private cache: RedisService,
    private events: EventPublisher,
    private idempotency: IdempotencyService,
  ) {}
  private cacheKey = `subscription:`;

  private async invalidate(userId: string) {
    await this.cache.del(`${this.cacheKey}${userId}`);
  }

  async getForUser(userId: string) {
    const key = `${this.cacheKey}${userId}`;
    const cached = await this.cache.get(key);
    if (cached) {
      return JSON.parse(cached);
    }

    const sub = await this.db.userSubscription.findUnique({
      where: { userId },
    });
    if (!sub) {
      throw new NotFoundException('Subscription not found');
    }

    await this.cache.set(key, JSON.stringify(sub), 3600);
    return sub;
  }

  async grant(userId: string, dto: GrantSubscriptionDto) {
    const plan = await this.db.plan.findUnique({
      where: { code: dto.planCode },
    });
    if (!plan) {
      throw new NotFoundException('Plan not found');
    }

    const status =
      (dto.status as subscriptionStatus) ?? subscriptionStatus.active;
    const expiresAt = dto.expiresAt ? new Date(dto.expiresAt) : null;

    const sub = await this.db.userSubscription.upsert({
      where: { userId },
      create: { userId, planCode: dto.planCode, status, expiresAt },
      update: { planCode: dto.planCode, status, expiresAt },
    });

    await this.invalidate(userId);
    await this.events.subscriptionChanged({ userId, planCode: dto.planCode });
    return sub;
  }

  // --- Event consumers -----------------------------------------------------

  @RabbitSubscribe({
    exchange: EVENTS_EXCHANGE,
    routingKey: RoutingKey.UserRegistered,
    queue: 'billing.subscription.user-registered',
    queueOptions: { durable: true, deadLetterExchange: EVENTS_DLX },
  })
  async onUserRegistered(event: UserRegisteredEvent, amqpMsg: ConsumeMessage) {
    if (await this.idempotency.alreadyProcessed(amqpMsg.properties.messageId)) {
      return;
    }

    const existing = await this.db.userSubscription.findUnique({
      where: { userId: event.userId },
    });
    if (existing) {
      return;
    }

    await this.db.userSubscription.create({
      data: { userId: event.userId, planCode: FREE_PLAN },
    });

    await this.invalidate(event.userId);
    await this.events.subscriptionChanged({
      userId: event.userId,
      planCode: FREE_PLAN,
    });
    this.logger.log(`FREE subscription created for user ${event.userId}`);
  }
}
