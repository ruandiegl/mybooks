import { describe, expect, it } from 'vitest';
import { createAuthenticate } from '../src/modules/auth/auth.middleware.js';

const run = (middleware, authorization) => new Promise((resolve) => {
  const req = {
    header(name) { return name.toLowerCase() === 'authorization' ? authorization : undefined; }
  };
  middleware(req, {}, (error) => resolve({ req, error }));
});

describe('native auth middleware', () => {
  it('rejects a missing bearer token', async () => {
    const middleware = createAuthenticate({ verifyToken: async () => ({}), findActiveSession: async () => null });
    const result = await run(middleware);

    expect(result.error).toMatchObject({ code: 'UNAUTHENTICATED', statusCode: 401 });
  });

  it('loads an active session and never trusts a user id from the request', async () => {
    const middleware = createAuthenticate({
      verifyToken: async (token) => {
        expect(token).toBe('signed-token');
        return { userId: 'user-1', sessionId: 'session-1', jti: 'jti-1' };
      },
      findActiveSession: async (sessionId, userId) => {
        expect([sessionId, userId]).toEqual(['session-1', 'user-1']);
        return { id: 'session-1', user: { id: 'user-1', isActive: true } };
      }
    });

    const result = await run(middleware, 'Bearer signed-token');

    expect(result.error).toBeUndefined();
    expect(result.req.identity).toEqual({ userId: 'user-1', sessionId: 'session-1', jti: 'jti-1' });
    expect(result.req.currentUser).toMatchObject({ id: 'user-1' });
  });

  it('rejects expired, revoked, mismatched, or malformed sessions uniformly', async () => {
    const middleware = createAuthenticate({
      verifyToken: async () => ({ userId: 'user-1', sessionId: 'session-1', jti: 'jti-1' }),
      findActiveSession: async () => null
    });

    const result = await run(middleware, 'Bearer invalid');
    expect(result.error).toMatchObject({ code: 'UNAUTHENTICATED', statusCode: 401 });
  });

  it('never accepts the removed local identity header', async () => {
    const middleware = createAuthenticate({
      verifyToken: async () => ({}),
      findActiveSession: async () => null
    });
    const req = {
      header(name) {
        if (name.toLowerCase() === 'x-dev-user-id') return 'admin';
        return undefined;
      }
    };
    const result = await new Promise((resolve) => middleware(req, {}, (error) => resolve({ req, error })));

    expect(result.error).toMatchObject({ code: 'UNAUTHENTICATED', statusCode: 401 });
    expect(result.req.identity).toBeUndefined();
  });
});
