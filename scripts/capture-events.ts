// Dev helper: capture events from atlas.events for a few seconds.
// Usage: tsx scripts/capture-events.ts [ms]
import 'dotenv/config';
import amqp from 'amqplib';

const ms = Number(process.argv[2] ?? 3000);
const conn = await amqp.connect(process.env.RABBITMQ_URL!);
const ch = await conn.createChannel();
await ch.assertExchange('atlas.events', 'topic', { durable: true });
const { queue } = await ch.assertQueue('', { exclusive: true });
await ch.bindQueue(queue, 'atlas.events', '#');

ch.consume(
  queue,
  (msg) => {
    if (!msg) return;
    console.log(
      `CAPTURED ${msg.fields.routingKey} :: ${msg.content.toString()} (messageId=${msg.properties.messageId})`,
    );
  },
  { noAck: true },
);

setTimeout(async () => {
  await ch.close();
  await conn.close();
  process.exit(0);
}, ms);
console.log(`capturing atlas.events for ${ms}ms...`);
