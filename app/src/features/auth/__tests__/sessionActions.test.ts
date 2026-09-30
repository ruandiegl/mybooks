import { describe, expect, it, vi } from 'vitest';
import { signOutSession } from '../sessionActions';

describe('signOutSession', () => {
  it('revokes the server session before clearing local session state', async () => {
    const steps: string[] = [];
    const revoke = vi.fn(async () => { steps.push('revoke'); });
    const clearLocalSession = vi.fn(async () => { steps.push('clear'); });

    await signOutSession({ refreshToken: null, cookieSession: true, revoke, clearLocalSession });

    expect(steps).toEqual(['revoke', 'clear']);
    expect(revoke).toHaveBeenCalledWith(null);
  });

  it('keeps the local session when server revocation fails', async () => {
    const revoke = vi.fn(async () => { throw new Error('offline'); });
    const clearLocalSession = vi.fn();

    await expect(signOutSession({ refreshToken: 'refresh', cookieSession: false, revoke, clearLocalSession }))
      .rejects.toThrow('offline');
    expect(clearLocalSession).not.toHaveBeenCalled();
  });
});
