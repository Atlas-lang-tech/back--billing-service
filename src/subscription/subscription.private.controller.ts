import { Controller, Get, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/auth/current-user.decorator.js';
import {
  type UserContext,
  UserContextGuard,
} from '../common/auth/user-context.guard.js';
import { SubscriptionService } from './subscription.service.js';

@Controller('private/me/subscription')
@UseGuards(UserContextGuard)
export class SubscriptionPrivateController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @Get()
  getMySubscription(@CurrentUser() user: UserContext) {
    return this.subscriptionService.getForUser(user.id);
  }
}
