// Shared RabbitMQ contract for the Atlas ecosystem.
export const EVENTS_EXCHANGE = 'atlas.events';
export const EVENTS_DLX = 'atlas.events.dlx';

// Routing keys (see the ecosystem event contract).
export const RoutingKey = {
  UserRegistered: 'user.registered',
  CourseUpserted: 'course.upserted',
  CourseDeleted: 'course.deleted',
  SubscriptionChanged: 'subscription.changed',
  PlanUpserted: 'plan.upserted',
  CoursePurchased: 'course.purchased',
  PaymentSucceeded: 'billing.payment_succeeded',
} as const;

// Event payloads billing consumes.
export interface UserRegisteredEvent {
  userId: string;
}

export interface CourseUpsertedEvent {
  courseId: number;
  isFree: boolean;
  title: string;
}

export interface CourseDeletedEvent {
  courseId: number;
}

// Event payloads billing publishes.
export interface SubscriptionChangedEvent {
  userId: string;
  planCode: string;
}

export interface PlanUpsertedEvent {
  code: string;
  maxDictionaries: number;
  maxWordsPerDict: number;
  priceCents: number;
}

export interface CoursePurchasedEvent {
  userId: string;
  courseId: number;
  purchasedAt: string;
}

/**
 * Published after a successful paid charge. Consumed by mail-service to send the
 * invoice/receipt email. `eventId` is the idempotency key; `amount` is in major
 * units (e.g. 19.99).
 */
export interface PaymentSucceededEvent {
  eventId: string;
  userId: string;
  email: string;
  amount: number;
  currency: string;
  invoiceNumber: string;
  paidAt: string;
}
