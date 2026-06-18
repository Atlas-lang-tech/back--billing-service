import {
  Body,
  Controller,
  Param,
  ParseIntPipe,
  Put,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../common/auth/roles.decorator.js';
import { RolesGuard } from '../common/auth/roles.guard.js';
import { UserContextGuard } from '../common/auth/user-context.guard.js';
import { SetProductPriceDto } from './dto/set-product-price.dto.js';
import { ProductService } from './product.service.js';

@Controller('private/admin/products')
@UseGuards(UserContextGuard, RolesGuard)
@Roles(['ADMIN'])
export class ProductAdminController {
  constructor(private readonly productService: ProductService) {}

  @Put(':courseId')
  setPrice(
    @Param('courseId', ParseIntPipe) courseId: number,
    @Body() dto: SetProductPriceDto,
  ) {
    return this.productService.setPrice(courseId, dto);
  }
}
