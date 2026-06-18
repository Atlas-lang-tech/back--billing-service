import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../common/auth/current-user.decorator.js';
import {
  type UserContext,
  UserContextGuard,
} from '../common/auth/user-context.guard.js';
import { PurchaseService } from './purchase.service.js';

@Controller('private')
@UseGuards(UserContextGuard)
export class PurchasePrivateController {
  constructor(private readonly purchaseService: PurchaseService) {}

  @Post('purchase/course/:courseId')
  purchaseCourse(
    @CurrentUser() user: UserContext,
    @Param('courseId', ParseIntPipe) courseId: number,
  ) {
    return this.purchaseService.purchaseCourse(user, courseId);
  }

  @Get('me/purchases')
  myPurchases(@CurrentUser() user: UserContext) {
    return this.purchaseService.myPurchases(user.id);
  }

  @Get('me/access/:courseId')
  access(
    @CurrentUser() user: UserContext,
    @Param('courseId', ParseIntPipe) courseId: number,
  ) {
    return this.purchaseService.access(user, courseId);
  }
}
