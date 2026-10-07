// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const device = vi.hoisted(() => ({ os: 'web' }));
vi.mock('react-native', async () => {
  const native = await import('react-native-web');
  const platform = (native as unknown as { Platform: typeof import('react-native')['Platform'] }).Platform;
  return { ...native, Platform: { ...platform, get OS() { return device.os; } } };
});
import { Avatar } from '../../../components/Avatar';
beforeEach(() => { device.os = 'web'; });
afterEach(cleanup);

describe('own-avatar browser actions', () => {
  it('cancels the browser image menu when long-press actions belong to the app', () => {
    const { container } = render(<Avatar name="Ana" url="https://signed.test/avatar.jpg" suppressBrowserActions />);
    const image = container.querySelector('img')!;
    const menu = new MouseEvent('contextmenu', { bubbles: true, cancelable: true });
    expect(fireEvent(image, menu)).toBe(false);
    expect(menu.defaultPrevented).toBe(true);
  });
  it('makes guarded image pixels non-interactive without blocking touch gestures', () => {
    const { container } = render(<Avatar name="Ana" url="https://signed.test/avatar.jpg" suppressBrowserActions />);
    const wrapper = container.firstElementChild!;
    const image = container.querySelector('img')!;
    expect(getComputedStyle(image.parentElement!).pointerEvents).toBe('none');
    expect(getComputedStyle(wrapper).userSelect).toBe('none');
    const touch = new Event('touchstart', { bubbles: true, cancelable: true });
    expect(fireEvent(wrapper, touch)).toBe(true);
    expect(touch.defaultPrevented).toBe(false);
    expect(getComputedStyle(wrapper).getPropertyValue('touch-action')).not.toBe('none');
  });
  it('does not change browser actions for unguarded avatars or native apps', () => {
    for (const [os, guarded] of [['web', false], ['ios', true], ['android', true]] as const) {
      device.os = os;
      const { container, unmount } = render(<Avatar name="Ana" url="https://signed.test/avatar.jpg" suppressBrowserActions={guarded} />);
      const menu = new MouseEvent('contextmenu', { bubbles: true, cancelable: true });
      expect(fireEvent(container.firstElementChild!, menu)).toBe(true);
      expect(getComputedStyle(container.firstElementChild!).userSelect).not.toBe('none');
      unmount();
    }
  });
});
