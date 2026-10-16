// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const html = readFileSync('public/index.html', 'utf8');
function boot(dark = false) {
  const parsed = new DOMParser().parseFromString(html, 'text/html');
  document.head.innerHTML = parsed.head.innerHTML;
  document.body.innerHTML = parsed.body.innerHTML;
  Object.defineProperty(window, 'matchMedia', { configurable: true, value: () => ({ matches: dark }) });
  for (const script of document.querySelectorAll('script')) new Function(script.textContent || '')();
  document.dispatchEvent(new Event('DOMContentLoaded'));
}
beforeEach(() => { vi.useFakeTimers(); localStorage.clear(); delete (window as any).__trocalivrosBoot; delete (window as any).__trocalivrosPwaInstallBridge; });
afterEach(() => { (window as any).__trocalivrosBoot?.release(); vi.clearAllTimers(); vi.useRealTimers(); document.body.innerHTML = ''; vi.restoreAllMocks(); });
it('presents local brand and busy status without React, API or fonts', () => {
  boot();
  const surface = document.getElementById('tl-boot');
  expect(surface).not.toBeNull(); expect(surface?.hidden).toBe(false);
  expect(surface?.textContent).toContain('TrocaLivros');
  expect(surface?.querySelector('img')?.getAttribute('src')).toBe('/brand/boot-mark.svg');
  expect(surface?.querySelector('[role="status"]')?.textContent).toContain('Abrindo');
  expect(document.getElementById('root')?.children.length).toBe(0);
});
it.each([['light', true, '#fff8f7'], ['dark', false, '#181318'], ['system', true, '#181318']])('keeps the early %s preference coherent with boot colors', (theme, system, expected) => {
  localStorage.setItem('trocalivros.appearance.v1', JSON.stringify({ version: 1, theme })); boot(system as boolean);
  expect(document.documentElement.style.backgroundColor).toBe(expected === '#181318' ? 'rgb(24, 19, 24)' : 'rgb(255, 248, 247)');
  expect(document.getElementById('tl-boot')).not.toBeNull();
});
it('uses system appearance when public storage is blocked', () => {
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw Error('blocked'); }); boot(true);
  expect(document.documentElement.style.colorScheme).toBe('dark');
  expect(document.getElementById('tl-boot')).not.toBeNull();
});
it('explains a stalled bundle at 15 seconds and permits late idempotent handoff', () => {
  boot(); expect((window as any).__trocalivrosBoot).toBeDefined();
  vi.advanceTimersByTime(14999); expect(document.getElementById('tl-boot-reload')?.hidden).toBe(true);
  vi.advanceTimersByTime(1); expect(document.getElementById('tl-boot-reload')?.hidden).toBe(false);
  expect(document.getElementById('tl-boot-status')?.textContent).toContain('demorou');
  (window as any).__trocalivrosBoot.release(); (window as any).__trocalivrosBoot.release();
  vi.advanceTimersByTime(60000); expect(document.getElementById('tl-boot')).toBeNull();
  expect(vi.getTimerCount()).toBe(0);
});
it('releases before the timeout without leaving an accessible ghost loader', () => {
  boot(); expect((window as any).__trocalivrosBoot).toBeDefined();
  (window as any).__trocalivrosBoot.release(); vi.advanceTimersByTime(15000);
  expect(document.getElementById('tl-boot')).toBeNull(); expect(vi.getTimerCount()).toBe(0);
});
it('retains a text fallback when logo fails and keeps early install capture', () => {
  boot(); const image = document.querySelector('#tl-boot img'); expect(image).not.toBeNull();
  image!.dispatchEvent(new Event('error')); expect(document.getElementById('tl-boot')?.textContent).toContain('TrocaLivros');
  const install = new Event('beforeinstallprompt', { cancelable: true }); window.dispatchEvent(install);
  expect(install.defaultPrevented).toBe(true); expect((window as any).__trocalivrosPwaInstallBridge.pending).toBe(install);
});
it('keeps noscript outside the inactive boot overlay when scripts are disabled', () => {
  const parsed = new DOMParser().parseFromString(html, 'text/html');
  expect(parsed.getElementById('tl-boot')?.hidden).toBe(true);
  expect(parsed.querySelector('noscript')?.textContent).toContain('Ative o JavaScript');
});
