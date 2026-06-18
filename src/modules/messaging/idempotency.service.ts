import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../redis/redis.service.js';

const DEDUPE_TTL = 24 * 3600; // seconds

/**
 * Deduplicates event processing by `messageId`. The first consumer to see a
 * messageId wins (atomic Redis SET NX); later redeliveries are skipped, making
 * handlers idempotent.
 */
@Injectable()
export class IdempotencyService {
  private readonly logger = new Logger(IdempotencyService.name);

  constructor(private readonly cache: RedisService) {}

  /**
   * Returns true if this messageId was already processed (caller should skip).
   * A missing messageId is treated as never-seen (cannot dedupe) and logged.
   */
  async alreadyProcessed(messageId?: string): Promise<boolean> {
    if (!messageId) {
      this.logger.warn('Event without messageId — cannot dedupe');
      return false;
    }

    const fresh = await this.cache.setNx(`event:${messageId}`, '1', DEDUPE_TTL);
    return !fresh;
  }
}
