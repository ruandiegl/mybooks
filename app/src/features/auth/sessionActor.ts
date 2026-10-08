export type SessionActor = { userId: string; epoch: number; sessionId: string };
export function accessSessionId(token: string, userId: string): string | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3 || parts[1].length > 4096) return null;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    return payload.sub === userId && typeof payload.sid === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(payload.sid) ? payload.sid : null;
  } catch { return null; }
}
export function settingsActorHeaders(actor: SessionActor) {
  return { 'X-Settings-Owner': actor.userId, 'X-Settings-Session': actor.sessionId };
}
