import { Body, Controller, Param, Put, UseGuards } from '@nestjs/common';
import { Roles } from '../common/auth/roles.decorator.js';
import { RolesGuard } from '../common/auth/roles.guard.js';
import { UserContextGuard } from '../common/auth/user-context.guard.js';
import { GrantSubscriptionDto } from './dto/grant-subscription.dto.js';
import { SubscriptionService } from './subscription.service.js';

@Controller('private/admin/subscriptions')
@UseGuards(UserContextGuard, RolesGuard)
@Roles(['ADMIN'])
export class SubscriptionAdminController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @Put(':userId')
  grant(@Param('userId') userId: string, @Body() dto: GrantSubscriptionDto) {
    return this.subscriptionService.grant(userId, dto);
  }
}
