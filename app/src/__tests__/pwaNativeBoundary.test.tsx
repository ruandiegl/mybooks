import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { WebViewportGate } from '../components/WebViewportGate/index';
import { PwaInstallAction } from '../components/PwaInstallAction/index';
import { PwaInstallPanel, PwaInstallSettingsPanel } from '../components/PwaInstallPanel/index';
import { PwaInstallProvider, usePwaInstall } from '../features/pwa/PwaInstallProvider';
it('keeps native content without DOM access, a gate, or installation promotion', () => {
  function Status() { return <span>{usePwaInstall().state}</span>; }
  expect(typeof window).toBe('undefined');
  const markup = renderToStaticMarkup(<PwaInstallProvider><WebViewportGate><p>App nativo</p><PwaInstallAction /><PwaInstallPanel /><PwaInstallSettingsPanel /><Status /></WebViewportGate></PwaInstallProvider>);
  expect(markup).toBe('<p>App nativo</p><span>unavailable</span>');
});
