import { describe, expect, it } from 'vitest';
import {
  calculateCheckIn,
  getSaoPauloDayKey,
  isStreakActive
} from '../src/modules/gamification/gamification.service.js';

describe('daily streak rules', () => {
  it('starts a streak at one on first check-in', () => {
    expect(calculateCheckIn({ lastActiveDay: null, currentActiveStreak: null }, '2026-10-26'))
      .toEqual({ lastActiveDay: '2026-10-26', currentActiveStreak: 1, checkedInToday: true });
  });

  it('does not increment twice on the same day', () => {
    expect(calculateCheckIn({ lastActiveDay: '2026-10-26', currentActiveStreak: 4 }, '2026-10-26'))
      .toEqual({ lastActiveDay: '2026-10-26', currentActiveStreak: 4, checkedInToday: false });
  });

  it('increments on the next Sao Paulo day', () => {
    expect(calculateCheckIn({ lastActiveDay: '2026-10-26', currentActiveStreak: 4 }, '2026-10-27'))
      .toEqual({ lastActiveDay: '2026-10-27', currentActiveStreak: 5, checkedInToday: true });
  });

  it('restarts after a missed calendar day', () => {
    expect(calculateCheckIn({ lastActiveDay: '2026-10-24', currentActiveStreak: 4 }, '2026-10-26'))
      .toEqual({ lastActiveDay: '2026-10-26', currentActiveStreak: 1, checkedInToday: true });
  });

  it('uses the Sao Paulo day around UTC midnight', () => {
    expect(getSaoPauloDayKey(new Date('2026-10-27T02:59:59.999Z'))).toBe('2026-10-26');
    expect(getSaoPauloDayKey(new Date('2026-10-27T03:00:00.000Z'))).toBe('2026-10-27');
  });
});

describe('active streak eligibility', () => {
  it('keeps a positive streak active for today and yesterday', () => {
    expect(isStreakActive({ lastActiveDay: '2026-10-26', currentActiveStreak: 2 }, '2026-10-26')).toBe(true);
    expect(isStreakActive({ lastActiveDay: '2026-10-25', currentActiveStreak: 2 }, '2026-10-26')).toBe(true);
  });

  it.each([
    ['anteontem', '2026-10-24', 2],
    ['uma data futura', '2026-10-27', 2],
    ['sem última presença', null, 2],
    ['sequência zerada', '2026-10-26', 0],
    ['sequência nula', '2026-10-26', null]
  ])('marks %s as inactive', (_label, lastActiveDay, currentActiveStreak) => {
    expect(isStreakActive({ lastActiveDay, currentActiveStreak }, '2026-10-26')).toBe(false);
  });
});
