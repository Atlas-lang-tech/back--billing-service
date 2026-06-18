import 'dotenv/config';
import { defineConfig } from 'prisma/config';

// Prisma 7: connection URL for migrate/introspection lives here, not in the
// schema. The runtime client gets its connection via PrismaPg adapter in
// PrismaService (see CONVENTIONS.md §3).
export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: process.env.DATABASE_URL,
  },
  migrations: {
    seed: 'tsx prisma/seed.ts',
  },
});
