import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { ProductService } from './product.service.js';

@Controller('public/products')
export class ProductPublicController {
  constructor(private readonly productService: ProductService) {}

  @Get()
  getProducts() {
    return this.productService.findAllActive();
  }

  @Get(':courseId')
  getProduct(@Param('courseId', ParseIntPipe) courseId: number) {
    return this.productService.findOne(courseId);
  }
}
