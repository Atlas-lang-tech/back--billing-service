import {
  Body,
  Controller,
  Delete,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../common/auth/roles.decorator.js';
import { RolesGuard } from '../common/auth/roles.guard.js';
import { UserContextGuard } from '../common/auth/user-context.guard.js';
import { Role } from '../common/auth/roles.js';
import { UpdatePlanDto, UpsertPlanDto } from './dto/upsert-plan.dto.js';
import { PlanService } from './plan.service.js';

@Controller('private/admin/plans')
@UseGuards(UserContextGuard, RolesGuard)
@Roles([Role.ADMIN])
export class PlanAdminController {
  constructor(private readonly planService: PlanService) {}

  @Post()
  createPlan(@Body() dto: UpsertPlanDto) {
    return this.planService.create(dto);
  }

  @Put(':code')
  updatePlan(@Param('code') code: string, @Body() dto: UpdatePlanDto) {
    return this.planService.update(code, dto);
  }

  @Delete(':code')
  async deletePlan(@Param('code') code: string) {
    await this.planService.delete(code);
    return { message: 'Plan deleted successfully' };
  }
}
