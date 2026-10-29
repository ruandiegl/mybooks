import { describe, expect, it, vi } from 'vitest';
import { addPendingRemoval } from '../realtime';
import { checkMatchRemovalStatus, removeMatchAfterConfirmation } from '../matchRemoval';

const event = { matchId: 'e204f86a-3d8b-4fe5-a5e9-fbb98c2e74aa', conversationId: 'b204f86a-3d8b-4fe5-a5e9-fbb98c2e74aa' };

describe('confirmed match removal', () => {
  it('does not call either endpoint when the person cancels confirmation', async () => {
    const deleteMatch = vi.fn(async () => ({ status: 204 }));
    const getConversations = vi.fn(async () => [{ id: event.conversationId }]);

    await expect(removeMatchAfterConfirmation({ confirmed: false, ...event, deleteMatch, getConversations }))
      .resolves.toEqual({ status: 'cancelled' });
    expect(deleteMatch).not.toHaveBeenCalled();
    expect(getConversations).not.toHaveBeenCalled();
  });

  it('treats the documented 204 response as confirmed without reconciliation', async () => {
    const deleteMatch = vi.fn(async () => ({ status: 204 }));
    const getConversations = vi.fn(async () => [{ id: event.conversationId }]);

    await expect(removeMatchAfterConfirmation({ confirmed: true, ...event, deleteMatch, getConversations }))
      .resolves.toEqual({ status: 'removed' });
    expect(deleteMatch).toHaveBeenCalledTimes(1);
    expect(getConversations).not.toHaveBeenCalled();
  });

  it('keeps the match active when an inconclusive delete is reconciled with the conversation list', async () => {
    const deleteMatch = vi.fn(async () => { throw new Error('request timed out'); });
    const getConversations = vi.fn(async () => [{ id: event.conversationId }]);

    await expect(removeMatchAfterConfirmation({ confirmed: true, ...event, deleteMatch, getConversations }))
      .resolves.toEqual({ status: 'still-active' });
    expect(getConversations).toHaveBeenCalledTimes(1);
  });

  it('confirms removal when an inconclusive delete is followed by an absent conversation', async () => {
    const deleteMatch = vi.fn(async () => { throw new Error('connection reset'); });
    const getConversations = vi.fn(async () => []);

    await expect(removeMatchAfterConfirmation({ confirmed: true, ...event, deleteMatch, getConversations }))
      .resolves.toEqual({ status: 'removed' });
  });

  it('keeps an inconclusive result when reconciliation also fails', async () => {
    const deleteMatch = vi.fn(async () => { throw new Error('request timed out'); });
    const getConversations = vi.fn(async () => { throw new Error('network unavailable'); });

    await expect(removeMatchAfterConfirmation({ confirmed: true, ...event, deleteMatch, getConversations }))
      .resolves.toEqual({ status: 'uncertain' });
  });

  it('checks removal state without sending another delete request', async () => {
    const getConversations = vi.fn(async () => []);

    await expect(checkMatchRemovalStatus({ conversationId: event.conversationId, getConversations }))
      .resolves.toEqual({ status: 'removed' });
    expect(getConversations).toHaveBeenCalledTimes(1);
  });

  it('deduplicates the HTTP confirmation when the realtime event already announced removal', async () => {
    let notices = [event];
    notices = addPendingRemoval(notices, event);
    const deleteMatch = vi.fn(async () => ({ status: 204 }));
    const result = await removeMatchAfterConfirmation({ confirmed: true, ...event, deleteMatch, getConversations: vi.fn() });
    if (result.status === 'removed') notices = addPendingRemoval(notices, event);

    expect(result).toEqual({ status: 'removed' });
    expect(notices).toEqual([event]);
  });
});
