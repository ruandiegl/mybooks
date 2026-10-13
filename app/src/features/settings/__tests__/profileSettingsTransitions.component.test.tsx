// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useProfileSettings } from '../useProfileSettings';
const actor = { userId: 'reader', epoch: 1, sessionId: '10000000-0000-4000-8000-000000000001' };
describe('settings route ownership and dismissal', () => {
  it('keeps busy settings open and uses an internal discard confirmation', () => {
    let discarded = 0;
    const options = { actor, isBusy: false, hasUnsavedChanges: false, cropActive: false, onCancelCrop: () => {}, onDiscard: () => { discarded++; } };
    const { result, rerender } = renderHook(props => useProfileSettings(props), { initialProps: options });
    act(() => { result.current.openMenu(); result.current.openRoute('editProfile'); });
    rerender({ ...options, isBusy: true, hasUnsavedChanges: true });
    act(() => result.current.requestClose());
    expect(result.current.visible).toBe(true); expect(result.current.route).toBe('editProfile');
    rerender({ ...options, hasUnsavedChanges: true });
    act(() => result.current.back());
    expect(result.current.route).toBe('confirmDiscard');
    act(() => result.current.back());
    expect(result.current.route).toBe('editProfile'); expect(discarded).toBe(0);
    act(() => { result.current.back(); });
    act(() => result.current.confirmDiscard());
    expect(result.current.route).toBe('menu'); expect(discarded).toBe(1);
  });
  it('cancels the crop first and closes on another login of the same account', () => {
    let cancelled = 0;
    const options = { actor, isBusy: false, hasUnsavedChanges: false, cropActive: true, onCancelCrop: () => { cancelled++; }, onDiscard: () => {} };
    const { result, rerender } = renderHook(props => useProfileSettings(props), { initialProps: options });
    act(() => { result.current.openMenu(); result.current.openRoute('editProfile'); });
    act(() => result.current.back());
    expect(cancelled).toBe(1); expect(result.current.route).toBe('editProfile');
    rerender({ ...options, actor: { ...actor, epoch: 2 } });
    expect(result.current.visible).toBe(false);
  });
});
