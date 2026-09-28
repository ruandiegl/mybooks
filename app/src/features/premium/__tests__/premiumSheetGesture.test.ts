import { describe, expect, it } from 'vitest';
import { shouldDismissPremiumSheet } from '../premiumSheetGesture';

describe('shouldDismissPremiumSheet', () => {
  it('dismisses after a deliberate downward drag', () => {
    expect(shouldDismissPremiumSheet(140, 0)).toBe(true);
  });

  it('dismisses after a short, fast downward flick', () => {
    expect(shouldDismissPremiumSheet(30, 1.2)).toBe(true);
  });

  it('keeps the sheet open for a small drag or an upward gesture', () => {
    expect(shouldDismissPremiumSheet(40, 0.4)).toBe(false);
    expect(shouldDismissPremiumSheet(-160, -1.8)).toBe(false);
  });
});
