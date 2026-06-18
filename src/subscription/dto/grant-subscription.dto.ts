import { IsDateString, IsOptional, IsString } from 'class-validator';

export class GrantSubscriptionDto {
  @IsString()
  planCode!: string;

  // One of subscriptionStatus values; defaults to `active`.
  @IsOptional()
  @IsString()
  status?: string;

  // ISO date when the plan ends. Omit for a perpetual subscription.
  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
