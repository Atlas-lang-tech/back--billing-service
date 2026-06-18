import { describe, expect, it, jest } from '@jest/globals';
import { createMockPrisma, createMockRedis } from './mocks.js';

describe('testing mocks', () => {
  it('createMockPrisma exposes CRUD jest.fn per model', () => {
    const prisma = createMockPrisma();
    expect(jest.isMockFunction(prisma.invoice.findMany)).toBe(true);
    expect(jest.isMockFunction(prisma.invoice.create)).toBe(true);
  });

  it('createMockPrisma.$transaction runs a callback inline', async () => {
    const prisma = createMockPrisma();
    const result = await prisma.$transaction(async () => 42);
    expect(result).toBe(42);
  });

  it('createMockRedis defaults to a cache-miss', async () => {
    const redis = createMockRedis();
    await expect(redis.get('any')).resolves.toBeNull();
  });
});
