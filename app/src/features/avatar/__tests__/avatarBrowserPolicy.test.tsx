import React, { type ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
vi.mock('react-native', async () => await import('react-native-web'));
import { StyleSheet } from 'react-native-web';
import { Avatar } from '../../../components/Avatar';
const { renderToStaticMarkup } = await vi.importActual<{ renderToStaticMarkup: (node: ReactNode) => string }>('react-dom/server');

describe('exported Safari avatar policy', () => {
  it('emits callout suppression only on opted-in avatar classes', () => {
    const markup = renderToStaticMarkup(<Avatar name="Ana" suppressBrowserActions />);
    const ordinaryMarkup = renderToStaticMarkup(<Avatar name="Ana" />);
    // jsdom drops unknown WebKit declarations; inspect the real export boundary.
    const css = (StyleSheet as unknown as { getSheet: () => { textContent: string } }).getSheet().textContent;
    const rules = Array.from(css.matchAll(/([^{}]+)\{([^{}]*)\}/g));
    const callouts = rules.filter(rule => /(?:^|;)-webkit-touch-callout:none(?:;|$)/.test(rule[2])).map(rule => rule[1].trim());
    const classes = markup.match(/class="([^"]+)"/)![1].split(/\s+/);
    const ordinaryClasses = ordinaryMarkup.match(/class="([^"]+)"/)![1].split(/\s+/);
    expect(callouts.some(selector => classes.some(name => selector === '.' + name))).toBe(true);
    expect(callouts.some(selector => ordinaryClasses.some(name => selector === '.' + name))).toBe(false);
    expect(callouts.some(selector => /(?:^|,)(?:html|body|#root)(?:,|$)/.test(selector))).toBe(false);
  });
});
