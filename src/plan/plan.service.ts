import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventPublisher } from '../modules/messaging/event-publisher.service.js';
import { PrismaService } from '../modules/Prisma/prisma.service.js';
import { RedisService } from '../modules/redis/redis.service.js';
import { UpdatePlanDto, UpsertPlanDto } from './dto/upsert-plan.dto.js';

@Injectable()
export class PlanService {
  constructor(
    private db: PrismaService,
    private cache: RedisService,
    private events: EventPublisher,
  ) {}
  private cacheKey = `plan:`;

  private async invalidate(code: string) {
    await this.cache.del(`${this.cacheKey}active`);
    await this.cache.del(`${this.cacheKey}${code}`);
  }

  private async announce(plan: {
    code: string;
    maxDictionaries: number;
    maxWordsPerDict: number;
    priceCents: number;
  }) {
    await this.events.planUpserted({
      code: plan.code,
      maxDictionaries: plan.maxDictionaries,
      maxWordsPerDict: plan.maxWordsPerDict,
      priceCents: plan.priceCents,
    });
  }

  async findAllActive() {
    const key = `${this.cacheKey}active`;
    const cached = await this.cache.get(key);
    if (cached) {
      return JSON.parse(cached);
    }

    const plans = await this.db.plan.findMany({ where: { isActive: true } });
    await this.cache.set(key, JSON.stringify(plans), 3600);
    return plans;
  }

  async create(dto: UpsertPlanDto) {
    const exists = await this.db.plan.findUnique({ where: { code: dto.code } });
    if (exists) {
      throw new ConflictException('Plan already exists');
    }

    const plan = await this.db.plan.create({ data: dto });

    await this.invalidate(plan.code);
    await this.announce(plan);
    return plan;
  }

  async update(code: string, dto: UpdatePlanDto) {
    const plan = await this.db.plan.findUnique({ where: { code } });
    if (!plan) {
      throw new NotFoundException('Plan not found');
    }

    const updated = await this.db.plan.update({ where: { code }, data: dto });

    await this.invalidate(code);
    await this.announce(updated);
    return updated;
  }

  async delete(code: string): Promise<void> {
    const plan = await this.db.plan.findUnique({ where: { code } });
    if (!plan) {
      throw new NotFoundException('Plan not found');
    }

    await this.db.plan.delete({ where: { code } });
    await this.invalidate(code);
  }
}
