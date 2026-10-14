// @vitest-environment jsdom
import React from 'react';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { GestureResponderEvent, PanResponderGestureState } from 'react-native';

const boundary = vi.hoisted(() => ({ animation: '', release: undefined as ((event: GestureResponderEvent, gesture: PanResponderGestureState) => void) | undefined }));
vi.mock('react-native', async () => {
  const native = await import('react-native-web') as unknown as typeof import('react-native');
  return {
    ...native,
    useWindowDimensions: () => ({ width: 375, height: 812, fontScale: 1, scale: 1 }),
    Modal: (props: React.ComponentProps<typeof native.Modal>) => { boundary.animation = props.animationType ?? 'none'; return React.createElement(native.Modal, props); },
    PanResponder: { ...native.PanResponder, create: (config: Parameters<typeof native.PanResponder.create>[0]) => { boundary.release = config.onPanResponderRelease; return native.PanResponder.create(config); } },
  };
});
vi.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 59, bottom: 34, left: 0, right: 0 }) }));
vi.mock('@expo/vector-icons/MaterialIcons', () => ({ default: () => null }));
import { MatchModal } from '../index';

const gesture = (dy: number, vy: number): PanResponderGestureState => ({ stateID: 1, moveX: 0, moveY: dy, x0: 0, y0: 0, dx: 0, dy, vx: 0, vy, numberActiveTouches: 0, _accountsForMovesUpTo: 0 });
beforeEach(() => { boundary.animation = ''; boundary.release = undefined; });
afterEach(cleanup);

describe('match bottom sheet', () => {
  it('uses slide motion normally and disables it for reduced motion', () => {
    const callbacks = { onClose: () => {}, onMessages: () => {} };
    const mounted = render(<MatchModal {...callbacks} visible reduceMotion={false} />);
    expect(boundary.animation).toBe('slide');
    mounted.rerender(<MatchModal {...callbacks} visible reduceMotion />);
    expect(boundary.animation).toBe('none');
  });
  it('does not render a closed dialog', () => {
    render(<MatchModal visible={false} reduceMotion onClose={() => {}} onMessages={() => {}} />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });
  it.each([[120, 0], [24, 1.1]])('dismisses after a downward drag of %s with velocity %s', async (dy, vy) => {
    function Host() {
      const [visible, setVisible] = React.useState(true);
      return <MatchModal visible={visible} reduceMotion onClose={() => setVisible(false)} onMessages={() => {}} />;
    }
    render(<Host />);
    await screen.findByRole('dialog');
    act(() => boundary.release!({} as GestureResponderEvent, gesture(dy, vy)));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });
  it.each([[119, 0], [23, 2], [-120, 2]])('keeps the sheet open for an incomplete drag of %s with velocity %s', async (dy, vy) => {
    const events: string[] = [];
    render(<MatchModal visible reduceMotion onClose={() => events.push('close')} onMessages={() => {}} />);
    await screen.findByRole('dialog');
    act(() => boundary.release!({} as GestureResponderEvent, gesture(dy, vy)));
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(events).toEqual([]);
  });
});
