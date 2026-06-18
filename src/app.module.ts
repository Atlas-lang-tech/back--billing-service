import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validate } from './common/env.validation.js';
import { PrismaModule } from './modules/Prisma/prisma.module.js';
import { RedisModule } from './modules/redis/redis.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate }),
    PrismaModule,
    RedisModule,
    // feature modules go here
  ],
})
export class AppModule {}
