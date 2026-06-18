# back--billing-service

Billing microservice (NestJS 11 + Prisma 7 + PostgreSQL + Redis).
Architecture and code conventions: see [CONVENTIONS.md](./CONVENTIONS.md).

## Quick start

```bash
pnpm install
cp .env.example .env            # adjust if needed
docker compose up -d            # Postgres :5435, Redis :6382
pnpm prisma generate
pnpm prisma migrate dev         # apply migrations
pnpm start:dev                  # watch mode
```

- API prefix: `api/billing`
- Swagger UI: http://localhost:3000/docs

## Common commands

```bash
pnpm build           # nest build → dist/
pnpm start:prod      # node dist/src/main
pnpm test            # jest (ESM) unit tests
pnpm lint            # eslint --fix
pnpm format          # prettier --write
```

## Layout

```
src/
  main.ts                  bootstrap + Swagger
  app.module.ts            ConfigModule + Prisma + Redis + feature modules
  common/                  setup-app, env validation, interceptor, filter, test mocks
  modules/Prisma           PrismaService (custom client, pg adapter)
  modules/redis            RedisService (ioredis, @Global)
prisma/schema.prisma       models (camelCase + @@map)
prisma.config.ts           Prisma 7 datasource/migrate config
```

To add a domain, follow the checklist at the end of [CONVENTIONS.md](./CONVENTIONS.md).
