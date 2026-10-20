import type { MatchRemovedEvent } from './realtime';
export type { MatchRemovedEvent } from './realtime';

type NavigationRouteSnapshot = {
  name?: string;
  params?: object;
  state?: NavigationStateSnapshot;
};

type NavigationStateSnapshot = {
  index?: number;
  routes?: readonly NavigationRouteSnapshot[];
};

function containsActiveConversationRoute(state: NavigationStateSnapshot | undefined, conversationId: string): boolean {
  if (!state?.routes) return false;
  const activeIndex = typeof state.index === 'number' && state.index >= 0 && state.index < state.routes.length
    ? state.index
    : state.routes.length - 1;
  const activeRoute = state.routes[activeIndex];
  if (!activeRoute) return false;

  const routeNameMatches = activeRoute.name === 'Chat' || activeRoute.name === 'ExchangeBookDetails';
  const params = activeRoute.params as { conversationId?: unknown } | undefined;
  if (routeNameMatches && params?.conversationId === conversationId) return true;
  return containsActiveConversationRoute(activeRoute.state, conversationId);
}

export function shouldNavigateForRemovedMatch(
  state: NavigationStateSnapshot | undefined,
  event: MatchRemovedEvent,
  handledMatchIds: ReadonlySet<string>
): boolean {
  return !handledMatchIds.has(event.matchId) && containsActiveConversationRoute(state, event.conversationId);
}
