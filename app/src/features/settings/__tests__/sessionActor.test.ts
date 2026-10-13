import { expect, it } from 'vitest';
import { accessSessionId } from '../../auth/sessionActor';
const token = (payload: object) => `e30.${btoa(JSON.stringify(payload))}.signature`;
it('only captures well-formed correlation for the signed-in user', () => {
  const sid = '10000000-0000-4000-8000-000000000001';
  expect(accessSessionId(token({ sub: 'ana', sid }), 'ana')).toBe(sid);
  expect(accessSessionId(token({ sub: 'other', sid }), 'ana')).toBeNull();
  expect(accessSessionId(token({ sub: 'ana', sid: 'malformed' }), 'ana')).toBeNull();
  expect(accessSessionId('invalid', 'ana')).toBeNull();
});
