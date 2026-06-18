import { RabbitMQModule } from '@golevelup/nestjs-rabbitmq';
import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventPublisher } from './event-publisher.service.js';
import { EVENTS_DLX, EVENTS_EXCHANGE } from './messaging.constants.js';
import { IdempotencyService } from './idempotency.service.js';

@Global()
@Module({
  imports: [
    RabbitMQModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.getOrThrow<string>('RABBITMQ_URL'),
        exchanges: [
          { name: EVENTS_EXCHANGE, type: 'topic' },
          { name: EVENTS_DLX, type: 'topic' },
        ],
        connectionInitOptions: { wait: false },
        enableControllerDiscovery: true,
      }),
    }),
  ],
  providers: [EventPublisher, IdempotencyService],
  exports: [RabbitMQModule, EventPublisher, IdempotencyService],
})
export class MessagingModule {}
