import { Module } from '@nestjs/common';
import { PrismaModule } from '../modules/Prisma/prisma.module.js';
import { ProductAdminController } from './product.admin.controller.js';
import { ProductPublicController } from './product.public.controller.js';
import { ProductService } from './product.service.js';

@Module({
  imports: [PrismaModule],
  controllers: [ProductPublicController, ProductAdminController],
  providers: [ProductService],
})
export class ProductModule {}
