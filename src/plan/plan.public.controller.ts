import { Controller, Get } from '@nestjs/common';
import { PlanService } from './plan.service.js';

@Controller('public/plans')
export class PlanPublicController {
  constructor(private readonly planService: PlanService) {}

  @Get()
  getPlans() {
    return this.planService.findAllActive();
  }
}
