declare global {
  interface Window { __trocalivrosBoot?: { release(): void } }
}

/** The HTML owns its timer and DOM. No session or storage is touched. */
export async function releaseLaunchScreen(): Promise<void> {
  if (typeof window === 'undefined') return;
  try { window.__trocalivrosBoot?.release(); } catch { /* The app must remain usable without a shell bridge. */ }
}
