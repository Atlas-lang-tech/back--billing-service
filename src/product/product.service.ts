import { RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { ConsumeMessage } from 'amqplib';
import { IdempotencyService } from '../modules/messaging/idempotency.service.js';
import {
  type CourseDeletedEvent,
  type CourseUpsertedEvent,
  EVENTS_DLX,
  EVENTS_EXCHANGE,
  RoutingKey,
} from '../modules/messaging/messaging.constants.js';
import { PrismaService } from '../modules/Prisma/prisma.service.js';
import { RedisService } from '../modules/redis/redis.service.js';
import { SetProductPriceDto } from './dto/set-product-price.dto.js';

@Injectable()
export class ProductService {
  private readonly logger = new Logger(ProductService.name);

  constructor(
    private db: PrismaService,
    private cache: RedisService,
    private idempotency: IdempotencyService,
  ) {}
  private cacheKey = `product:`;

  private async invalidate(courseId: number) {
    await this.cache.del(`${this.cacheKey}active`);
    await this.cache.del(`${this.cacheKey}${courseId}`);
  }

  async findAllActive() {
    const key = `${this.cacheKey}active`;
    const cached = await this.cache.get(key);
    if (cached) {
      return JSON.parse(cached);
    }

    const products = await this.db.product.findMany({
      where: { isActive: true },
    });
    await this.cache.set(key, JSON.stringify(products), 3600);
    return products;
  }

  async findOne(courseId: number) {
    const key = `${this.cacheKey}${courseId}`;
    const cached = await this.cache.get(key);
    if (cached) {
      return JSON.parse(cached);
    }

    const product = await this.db.product.findFirst({
      where: { courseId, isActive: true },
    });
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    await this.cache.set(key, JSON.stringify(product), 3600);
    return product;
  }

  async setPrice(courseId: number, dto: SetProductPriceDto) {
    const product = await this.db.product.findUnique({ where: { courseId } });
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const updated = await this.db.product.update({
      where: { courseId },
      data: {
        priceCents: dto.priceCents,
        currency: dto.currency ?? product.currency,
        isActive: dto.isActive ?? true,
      },
    });

    await this.invalidate(courseId);
    return updated;
  }

  // --- Event consumers -----------------------------------------------------

  @RabbitSubscribe({
    exchange: EVENTS_EXCHANGE,
    routingKey: RoutingKey.CourseUpserted,
    queue: 'billing.product.course-upserted',
    queueOptions: { durable: true, deadLetterExchange: EVENTS_DLX },
  })
  async onCourseUpserted(event: CourseUpsertedEvent, amqpMsg: ConsumeMessage) {
    if (await this.idempotency.alreadyProcessed(amqpMsg.properties.messageId)) {
      return;
    }

    // Draft product: created inactive until an admin sets a price. Existing
    // price/isActive are preserved; only title/isFree are refreshed.
    await this.db.product.upsert({
      where: { courseId: event.courseId },
      create: {
        courseId: event.courseId,
        title: event.title,
        isFree: event.isFree,
        isActive: false,
      },
      update: { title: event.title, isFree: event.isFree },
    });

    await this.invalidate(event.courseId);
    this.logger.log(`Product upserted for course ${event.courseId}`);
  }

  @RabbitSubscribe({
    exchange: EVENTS_EXCHANGE,
    routingKey: RoutingKey.CourseDeleted,
    queue: 'billing.product.course-deleted',
    queueOptions: { durable: true, deadLetterExchange: EVENTS_DLX },
  })
  async onCourseDeleted(event: CourseDeletedEvent, amqpMsg: ConsumeMessage) {
    if (await this.idempotency.alreadyProcessed(amqpMsg.properties.messageId)) {
      return;
    }

    await this.db.product.updateMany({
      where: { courseId: event.courseId },
      data: { isActive: false },
    });

    await this.invalidate(event.courseId);
    this.logger.log(`Product deactivated for course ${event.courseId}`);
  }
}
