import { describe, expect, it, jest } from '@jest/globals';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard.js';

/**
 * Builds a guard whose Reflector resolves `@Roles(...)` to `requiredRoles`,
 * over a request carrying `user.role` (or no user when `role` is undefined).
 */
function setup(requiredRoles: string[] | undefined, role?: string) {
  const reflector = {
    getAllAndOverride: jest.fn(() => requiredRoles),
  } as unknown as Reflector;
  const request: any = { user: role ? { role } : undefined };
  const ctx = {
    getHandler: () => undefined,
    getClass: () => undefined,
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
  return { guard: new RolesGuard(reflector), ctx };
}

describe('RolesGuard', () => {
  it('allows the route when no @Roles metadata is present', () => {
    const { guard, ctx } = setup(undefined, 'USER');
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('allows the route when the metadata is an empty list', () => {
    const { guard, ctx } = setup([], 'USER');
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('allows a user whose role is in the required list', () => {
    const { guard, ctx } = setup(['ADMIN'], 'ADMIN');
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('forbids a user whose role is not in the required list', () => {
    const { guard, ctx } = setup(['ADMIN'], 'USER');
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('forbids when there is no authenticated user', () => {
    const { guard, ctx } = setup(['ADMIN']);
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });
});
