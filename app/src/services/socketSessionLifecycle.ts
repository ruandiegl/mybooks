import type { SocketRecoveryReason } from '../features/auth/authTransport';
type SocketBoundary = {
  on(event: string, listener: (...args: any[]) => void): unknown;
  off(event: string, listener: (...args: any[]) => void): unknown;
  connect(): unknown;
  disconnect?(): unknown;
};
export function bindSocketSessionLifecycle(socket: SocketBoundary, session: { isCurrent(): boolean; recover(reason: SocketRecoveryReason): Promise<boolean>; onRevoked(): Promise<void> }) {
  let stopped = false, recovering = false, attempted = false;
  const recover = async (reason: SocketRecoveryReason) => {
    if (stopped || !session.isCurrent() || recovering || attempted) return;
    recovering = true; attempted = true;
    try {
      if (await session.recover(reason) && !stopped && session.isCurrent()) { socket.disconnect?.(); socket.connect(); }
    } catch { /* transient failures retain the account and the HTTP fallback */ }
    finally { recovering = false; }
  };
  const connected = () => { attempted = false; };
  const error = (error: Error) => error.message === 'UNAUTHENTICATED' ? recover('unauthenticated') : Promise.resolve();
  const revoked = async ({ reason }: { reason?: string }) => {
    if (stopped || !session.isCurrent()) return;
    if (reason === 'rotated' || reason === 'expired') return recover(reason);
    if (reason !== 'terminal') return;
    attempted = true;
    await session.onRevoked();
  };
  socket.on('connect', connected); socket.on('connect_error', error); socket.on('session:revoked', revoked);
  return () => { stopped = true; socket.off('connect', connected); socket.off('connect_error', error); socket.off('session:revoked', revoked); };
}
