// Dev helper: publish a test event to the atlas.events exchange.
// Usage: tsx scripts/publish-event.ts <routingKey> <jsonPayload> [messageId]
import 'dotenv/config';
import amqp from 'amqplib';
import { randomUUID } from 'node:crypto';

const [, , routingKey, payload, messageId] = process.argv;

const conn = await amqp.connect(process.env.RABBITMQ_URL!);
const ch = await conn.createChannel();
await ch.assertExchange('atlas.events', 'topic', { durable: true });
ch.publish('atlas.events', routingKey, Buffer.from(payload), {
  persistent: true,
  contentType: 'application/json',
  messageId: messageId ?? randomUUID(),
});
await ch.close();
await conn.close();
console.log(`published ${routingKey} ${payload} (messageId=${messageId ?? 'random'})`);
