type SessionTransportInput = {
  platform: string;
  pageProtocol: string | null;
  pageOrigin: string | null;
  pageHostname: string | null;
  apiBaseUrl: string;
};

export function shouldUseCookieSession({ platform, pageProtocol, pageOrigin, apiBaseUrl }: SessionTransportInput) {
  if (platform !== 'web' || pageProtocol !== 'https:' || !pageOrigin) return false;
  try {
    const apiUrl = new URL(apiBaseUrl);
    return apiUrl.protocol === 'https:' && apiUrl.origin === pageOrigin;
  } catch {
    return false;
  }
}

function isLoopback(hostname: string) {
  const normalized = hostname.toLowerCase().replace(/^\[|\]$/g, '');
  return normalized === 'localhost' || normalized === '127.0.0.1' || normalized === '::1';
}

export function canUseWebAuthTransport(input: SessionTransportInput) {
  if (input.platform !== 'web') return true;
  if (shouldUseCookieSession(input)) return true;
  if (input.pageProtocol !== 'http:' || !input.pageHostname) return false;

  try {
    const apiUrl = new URL(input.apiBaseUrl);
    return apiUrl.protocol === 'http:' && isLoopback(input.pageHostname) && isLoopback(apiUrl.hostname);
  } catch {
    return false;
  }
}

type BrowserLockManager = {
  request<T>(name: string, options: { mode: 'exclusive' }, callback: () => Promise<T>): Promise<T>;
};

export async function withCookieRefreshLock<T>(
  cookieSession: boolean,
  operation: () => Promise<T>,
  lockManager?: BrowserLockManager | null
) {
  const availableLocks = lockManager === undefined ? (typeof navigator === 'undefined'
    ? undefined
    : (navigator as Navigator & { locks?: BrowserLockManager }).locks) : lockManager;
  if (!cookieSession) return operation();
  if (!availableLocks) throw new Error('Atualize o navegador para sincronizar a renovação segura da sessão.');
  return availableLocks.request('trocalivros-auth-refresh', { mode: 'exclusive' }, operation);
}
