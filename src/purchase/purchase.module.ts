import { Module } from '@nestjs/common';
import { PrismaModule } from '../modules/Prisma/prisma.module.js';
import { PurchasePrivateController } from './purchase.private.controller.js';
import { PurchaseService } from './purchase.service.js';

@Module({
  imports: [PrismaModule],
  controllers: [PurchasePrivateController],
  providers: [PurchaseService],
})
export class PurchaseModule {}
