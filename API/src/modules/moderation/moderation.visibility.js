export function visibleUserFilter(viewerId) {
  return {
    blocksMade: { none: { blockedId: viewerId } },
    blocksReceived: { none: { blockerId: viewerId } }
  };
}

export function visibleMatchFilter(viewerId) {
  return {
    userA: visibleUserFilter(viewerId),
    userB: visibleUserFilter(viewerId)
  };
}

export async function isBlockedPair(db, firstId, secondId) {
  return Boolean(await db.userBlock.findFirst({
    where: { OR: [
      { blockerId: firstId, blockedId: secondId },
      { blockerId: secondId, blockedId: firstId }
    ] },
    select: { blockerId: true }
  }));
}
