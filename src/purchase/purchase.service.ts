import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventPublisher } from '../modules/messaging/event-publisher.service.js';
import {
  PAYMENT_PROVIDER,
  type PaymentProvider,
} from '../modules/payment/payment.provider.js';
import { PrismaService } from '../modules/Prisma/prisma.service.js';
import type { UserContext } from '../common/auth/user-context.guard.js';

@Injectable()
export class PurchaseService {
  constructor(
    private db: PrismaService,
    @Inject(PAYMENT_PROVIDER) private payment: PaymentProvider,
    private events: EventPublisher,
  ) {}

  async purchaseCourse(user: UserContext, courseId: number) {
    const product = await this.db.product.findUnique({ where: { courseId } });
    if (!product || !product.isActive) {
      throw new NotFoundException('Course is not available for purchase');
    }
    if (product.isFree) {
      throw new BadRequestException('Course is free — no purchase required');
    }
    if (product.priceCents == null) {
      throw new BadRequestException('Course is not priced yet');
    }

    const existing = await this.db.coursePurchase.findUnique({
      where: { userId_courseId: { userId: user.id, courseId } },
    });
    if (existing) {
      throw new ConflictException('Course already owned');
    }

    const charge = await this.payment.charge({
      userId: user.id,
      amountCents: product.priceCents,
      currency: product.currency,
      reference: `course:${courseId}`,
    });
    if (!charge.ok) {
      throw new BadRequestException('Payment failed');
    }

    const purchase = await this.db.coursePurchase.create({
      data: { userId: user.id, courseId, priceCents: product.priceCents },
    });

    await this.events.coursePurchased({
      userId: user.id,
      courseId,
      purchasedAt: purchase.purchasedAt.toISOString(),
    });

    return purchase;
  }

  myPurchases(userId: string) {
    return this.db.coursePurchase.findMany({ where: { userId } });
  }

  async access(user: UserContext, courseId: number) {
    if (user.role === 'ADMIN') {
      return { courseId, hasAccess: true };
    }

    const product = await this.db.product.findUnique({ where: { courseId } });
    if (product?.isFree) {
      return { courseId, hasAccess: true };
    }

    const purchase = await this.db.coursePurchase.findUnique({
      where: { userId_courseId: { userId: user.id, courseId } },
    });

    return { courseId, hasAccess: !!purchase };
  }
}
