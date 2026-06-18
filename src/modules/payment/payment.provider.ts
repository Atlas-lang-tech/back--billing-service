export interface ChargeInput {
  userId: string;
  amountCents: number;
  currency: string;
  // Free-form reference, e.g. `course:<id>`.
  reference: string;
}

export interface ChargeResult {
  ok: boolean;
  // Provider-side transaction reference.
  ref: string;
}

/**
 * Abstraction over a payment service provider. The purchase flow depends only
 * on this interface, so a real PSP can replace the mock without other changes.
 */
export interface PaymentProvider {
  charge(input: ChargeInput): Promise<ChargeResult>;
}

// DI token — `PaymentProvider` is an interface and has no runtime value.
export const PAYMENT_PROVIDER = Symbol('PAYMENT_PROVIDER');
