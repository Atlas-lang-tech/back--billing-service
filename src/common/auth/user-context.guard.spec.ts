import { describe, expect, it } from '@jest/globals';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { UserContextGuard } from './user-context.guard.js';

/**
 * Builds a minimal ExecutionContext whose request exposes a Traefik-style
 * `header()` lookup over the given (lower-cased) headers.
 */
function context(headers: Record<string, string>) {
  const request: any = {
    header: (name: string) => headers[name.toLowerCase()],
  };
  return {
    request,
    ctx: {
      switchToHttp: () => ({ getRequest: () => request }),
    } as ExecutionContext,
  };
}

describe('UserContextGuard', () => {
  const guard = new UserContextGuard();

  it('attaches request.user from the forwarded headers', () => {
    const { ctx, request } = context({
      'x-user-id': 'u1',
      'x-user-role': 'ADMIN',
      'x-user-plan': 'PRO',
    });

    expect(guard.canActivate(ctx)).toBe(true);
    expect(request.user).toEqual({ id: 'u1', role: 'ADMIN', plan: 'PRO' });
  });

  it('defaults role to USER and plan to FREE when absent', () => {
    const { ctx, request } = context({ 'x-user-id': 'u1' });

    expect(guard.canActivate(ctx)).toBe(true);
    expect(request.user).toEqual({ id: 'u1', role: 'USER', plan: 'FREE' });
  });

  it('throws Unauthorized when x-user-id is missing', () => {
    const { ctx } = context({});

    expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
  });
});
