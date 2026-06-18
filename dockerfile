# syntax=docker/dockerfile:1

# ---- build stage ----
FROM node:24-alpine AS builder
WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm prisma generate && pnpm build

# ---- production stage ----
FROM node:24-alpine AS runner
WORKDIR /app

RUN corepack enable

ENV NODE_ENV=production

COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile --prod

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/generated ./generated
COPY --from=builder /app/prisma ./prisma

EXPOSE 3000

# Apply migrations on container start, then run the service.
CMD ["sh", "-c", "npx prisma migrate deploy && pnpm start:prod"]
