export type MatchRemovalStatus = 'cancelled' | 'removed' | 'still-active' | 'uncertain';

type RemovalOptions = {
  confirmed: boolean;
  conversationId: string;
  deleteMatch: () => Promise<{ status: number }>;
  getConversations: () => Promise<Array<{ id: string }>>;
};

type ReconciliationOptions = Pick<RemovalOptions, 'conversationId' | 'getConversations'>;

export async function checkMatchRemovalStatus(options: ReconciliationOptions): Promise<{ status: 'removed' | 'still-active' | 'uncertain' }> {
  try {
    const conversations = await options.getConversations();
    return { status: conversations.some((conversation) => conversation.id === options.conversationId) ? 'still-active' : 'removed' };
  } catch {
    return { status: 'uncertain' };
  }
}

export async function removeMatchAfterConfirmation(options: RemovalOptions): Promise<{ status: MatchRemovalStatus }> {
  if (!options.confirmed) return { status: 'cancelled' };

  try {
    const response = await options.deleteMatch();
    if (response.status === 204) return { status: 'removed' };
  } catch {
    // A network failure or non-definitive response is reconciled below.
  }

  return checkMatchRemovalStatus(options);
}
