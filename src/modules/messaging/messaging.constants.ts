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
