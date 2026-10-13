export const COOKIE_SESSION_LOCK = 'trocalivros.auth.refresh.v1';
export type BrowserLockManager = { request<T>(name: string, callback: () => Promise<T>): Promise<T> };
export function safeBrowserLocks(): BrowserLockManager | null {
  try { return typeof navigator === 'undefined' ? null : navigator.locks; } catch { return null; }
}
export function withBrowserSessionLock<T>(operation: () => Promise<T>, isCurrent?: () => boolean, locks = safeBrowserLocks()) {
  if (!locks) return Promise.reject(Error('Atualize o navegador para sincronizar sua sessão com segurança.'));
  return locks.request(COOKIE_SESSION_LOCK, async () => {
    if (isCurrent && !isCurrent()) throw Error('A sessão mudou. Abra as configurações novamente.');
    return operation();
  });
}
