export type SessionActor = { userId: string; epoch: number; sessionId: string };
function accessClaims(token: string): { sub?: unknown; sid?: unknown } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3 || parts[1].length > 4096) return null;
    return JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
  } catch { return null; }
}
export function accessSessionId(token: string, userId: string): string | null {
  const payload = accessClaims(token);
  return payload?.sub === userId && typeof payload.sid === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(payload.sid) ? payload.sid : null;
}
export function settingsActorHeaders(actor: SessionActor) {
  return { 'X-Settings-Owner': actor.userId, 'X-Settings-Session': actor.sessionId };
}
