import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import {
  ChargeInput,
  ChargeResult,
  PaymentProvider,
} from './payment.provider.js';

/**
 * Stub PSP that always succeeds. Replace with a real provider implementing
 * `PaymentProvider` and rebind the `PAYMENT_PROVIDER` token.
 */
@Injectable()
export class MockPaymentProvider implements PaymentProvider {
  private readonly logger = new Logger(MockPaymentProvider.name);

  async charge(input: ChargeInput): Promise<ChargeResult> {
    const ref = `mock_${randomUUID()}`;
    this.logger.log(
      `Mock charge ${input.amountCents} ${input.currency} for ${input.reference} (user ${input.userId}) → ${ref}`,
    );
    return { ok: true, ref };
  }
}
