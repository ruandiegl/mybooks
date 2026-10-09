// @vitest-environment jsdom
import React from 'react';
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const device = vi.hoisted(() => ({ os: 'web' }));
vi.mock('react-native', async () => {
  const native = await import('react-native-web');
  const platform = (native as unknown as { Platform: typeof import('react-native')['Platform'] }).Platform;
  return { ...native, Platform: { ...platform, get OS() { return device.os; } } };
});
import { mediaBinding, installDecodedImages } from '../../media/__tests__/fixtures';
import { Avatar } from '../../../components/Avatar';
beforeEach(() => { device.os = 'web'; installDecodedImages(); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe('own-avatar browser actions', () => {
  it('keeps unguarded Web image pixels interactive for normal browser actions', async () => {
    const mounted = render(<Avatar subjectId="reader" binding={mediaBinding} name="Ana" url="https://signed.test/avatar.jpg" />);
    await act(async () => {});
    const imageSurface = mounted.container.querySelector('img')?.closest('div[class]')!;
    expect(getComputedStyle(imageSurface).pointerEvents).not.toBe('none');
  });
  it('cancels the browser image menu when long-press actions belong to the app', async () => {
    const { container } = render(<Avatar subjectId="reader" binding={mediaBinding} name="Ana" url="https://signed.test/avatar.jpg" suppressBrowserActions />);
    await act(async () => {});
    const image = container.querySelector('img')!;
    const menu = new MouseEvent('contextmenu', { bubbles: true, cancelable: true });
    expect(fireEvent(image, menu)).toBe(false);
    expect(menu.defaultPrevented).toBe(true);
  });
  it('makes guarded image pixels non-interactive without blocking touch gestures', async () => {
    const { container } = render(<Avatar subjectId="reader" binding={mediaBinding} name="Ana" url="https://signed.test/avatar.jpg" suppressBrowserActions />);
    await act(async () => {});
    const wrapper = container.firstElementChild!;
    const image = container.querySelector('img')!;
    expect(getComputedStyle(image.closest('div[class]')!).pointerEvents).toBe('none');
    expect(getComputedStyle(wrapper).userSelect).toBe('none');
    const touch = new Event('touchstart', { bubbles: true, cancelable: true });
    expect(fireEvent(wrapper, touch)).toBe(true);
    expect(touch.defaultPrevented).toBe(false);
    expect(getComputedStyle(wrapper).getPropertyValue('touch-action')).not.toBe('none');
  });
  it('does not change browser actions for unguarded avatars or native apps', async () => {
    for (const [os, guarded] of [['web', false], ['ios', true], ['android', true]] as const) {
      device.os = os;
      const { container, unmount } = render(<Avatar subjectId="reader" binding={mediaBinding} name="Ana" url="https://signed.test/avatar.jpg" suppressBrowserActions={guarded} />);
    await act(async () => {});
      const menu = new MouseEvent('contextmenu', { bubbles: true, cancelable: true });
      expect(fireEvent(container.firstElementChild!, menu)).toBe(true);
      expect(getComputedStyle(container.firstElementChild!).userSelect).not.toBe('none');
      unmount();
    }
  });
});
