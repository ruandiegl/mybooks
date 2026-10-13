import { EventEmitter } from 'node:events';
export const sessionRevocations = new EventEmitter();
export function publishSessionRevocation(event) {
  if (!event?.userId || !event.sessionIds?.length) return;
  sessionRevocations.emit('revoked', { userId: event.userId, sessionIds: [...new Set(event.sessionIds)], reason: event.reason || 'terminal' });
}
