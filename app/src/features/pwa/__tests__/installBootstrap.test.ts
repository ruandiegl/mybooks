// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { afterEach, expect, it } from 'vitest';

afterEach(() => { delete window.__trocalivrosPwaInstallBridge; });

it('captures a prompt before the provider or fonts mount, without persisting it', () => {
  const html = readFileSync('public/index.html', 'utf8');
  const source = html.match(/<script id="pwa-install-bootstrap">([\s\S]*?)<\/script>/)?.[1];
  expect(source, 'early install bootstrap is present').toBeTruthy();
  window.eval(source!);
  const event = new Event('beforeinstallprompt', { cancelable: true });
  window.dispatchEvent(event);
  expect(event.defaultPrevented).toBe(true);
  expect(window.__trocalivrosPwaInstallBridge?.pending).toBe(event);
  window.dispatchEvent(new Event('appinstalled'));
  expect(window.__trocalivrosPwaInstallBridge?.pending).toBeNull();
  expect(window.__trocalivrosPwaInstallBridge?.installed).toBe(true);
  expect(localStorage.length).toBe(0);
});
