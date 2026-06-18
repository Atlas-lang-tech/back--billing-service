import { Module } from '@nestjs/common';
import { PrismaModule } from '../modules/Prisma/prisma.module.js';
import { SubscriptionAdminController } from './subscription.admin.controller.js';
import { SubscriptionPrivateController } from './subscription.private.controller.js';
import { SubscriptionService } from './subscription.service.js';

@Module({
  imports: [PrismaModule],
  controllers: [SubscriptionPrivateController, SubscriptionAdminController],
  providers: [SubscriptionService],
})
export class SubscriptionModule {}
