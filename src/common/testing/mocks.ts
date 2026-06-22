import { jest } from '@jest/globals';

type ModelMock = {
  findUnique: jest.Mock;
  findFirst: jest.Mock;
  findMany: jest.Mock;
  create: jest.Mock;
  update: jest.Mock;
  updateMany: jest.Mock;
  upsert: jest.Mock;
  delete: jest.Mock;
  deleteMany: jest.Mock;
  count: jest.Mock;
};

function createModelMock(): ModelMock {
  return {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    upsert: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
    count: jest.fn(),
  };
}

/**
 * Mock Prisma client for unit tests. Each model exposes the common CRUD
 * methods as jest.fn(). Add a new model here as the schema grows.
 * `$transaction` runs the callback inline so service code under test behaves
 * the same as against a real client.
 */
export function createMockPrisma() {
  return {
    plan: createModelMock(),
    userSubscription: createModelMock(),
    product: createModelMock(),
    coursePurchase: createModelMock(),
    $transaction: jest.fn((arg: unknown) => {
      if (typeof arg === 'function') {
        return (arg as (tx: unknown) => unknown)(createMockPrisma());
      }
      return Promise.all(arg as Promise<unknown>[]);
    }),
  };
}

/**
 * Mock Redis service. Defaults to a cache-miss (`get` → null) so cache-aside
 * reads fall through to the (mocked) DB.
 */
export function createMockRedis() {
  return {
    get: jest.fn(async () => null),
    set: jest.fn(async () => undefined),
    setNx: jest.fn(async () => true),
    del: jest.fn(async () => undefined),
    exists: jest.fn(async () => false),
    expire: jest.fn(async () => undefined),
    keys: jest.fn(async () => [] as string[]),
  };
}
