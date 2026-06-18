import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validate } from './common/env.validation.js';
import { MessagingModule } from './modules/messaging/messaging.module.js';
import { PaymentModule } from './modules/payment/payment.module.js';
import { PrismaModule } from './modules/Prisma/prisma.module.js';
import { RedisModule } from './modules/redis/redis.module.js';
import { PlanModule } from './plan/plan.module.js';
import { ProductModule } from './product/product.module.js';
import { PurchaseModule } from './purchase/purchase.module.js';
import { SubscriptionModule } from './subscription/subscription.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate }),
    PrismaModule,
    RedisModule,
    MessagingModule,
    PaymentModule,
    // feature modules
    PlanModule,
    ProductModule,
    SubscriptionModule,
    PurchaseModule,
  ],
})
export class AppModule {}
