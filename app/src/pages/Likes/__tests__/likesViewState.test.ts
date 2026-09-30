import { describe, expect, it } from 'vitest';
import { getLikesViewState } from '../likesViewState';

describe('getLikesViewState', () => {
  it('shows an error state instead of an empty sent-likes list after a failed request', () => {
    expect(getLikesViewState('sent', false, true)).toBe('sentError');
  });

  it('keeps loading ahead of an error until the first request settles', () => {
    expect(getLikesViewState('sent', true, true)).toBe('loading');
  });
});
