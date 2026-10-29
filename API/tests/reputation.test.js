import { describe, expect, it } from 'vitest';
import { reputationStars } from '../src/modules/moderation/reputation.js';

describe('reputationStars', () => {
  it('starts at five stars and counts one report per person', () => {
    expect(reputationStars(0, 0)).toBe(5);
    expect(reputationStars(1, 0)).toBe(4.5);
    expect(reputationStars(2, 1)).toBe(3.8);
  });

  it('never falls below one star', () => {
    expect(reputationStars(100, 100)).toBe(1);
  });
});
