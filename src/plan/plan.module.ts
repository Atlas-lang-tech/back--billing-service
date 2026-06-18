import { Module } from '@nestjs/common';
import { PrismaModule } from '../modules/Prisma/prisma.module.js';
import { PlanAdminController } from './plan.admin.controller.js';
import { PlanPublicController } from './plan.public.controller.js';
import { PlanService } from './plan.service.js';

@Module({
  imports: [PrismaModule],
  controllers: [PlanPublicController, PlanAdminController],
  providers: [PlanService],
})
export class PlanModule {}
