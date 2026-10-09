import { isMediaScopeCurrent } from './mediaIdentity';
import type { MediaRequest, MediaScope } from './mediaTypes';

type Job = { key: string; request: MediaRequest; scope: MediaScope; getScope: () => MediaScope | null; subscribers: Set<number>; state: 'queued' | 'loading' | 'ready' };
const sameScope = (a: MediaScope, b: MediaScope) => a.userId === b.userId && a.epoch === b.epoch;
const fetchable = (request: MediaRequest) => {
  if (!request.media.url) return false;
  if (!request.media.expiresAt) return true;
  const deadline = Date.parse(request.media.expiresAt);
  return Number.isFinite(deadline) && deadline - Date.now() > 20_000;
};

export function createMediaPrefetchQueue(warm: (url: string) => Promise<boolean>) {
  const jobs = new Map<string, Job>();
  let inFlight = 0, groupSequence = 0, warmed = 0, failed = 0, discarded = 0;
  const trim = () => {
    while (jobs.size > 24) {
      const removable = [...jobs.values()].find(job => job.state === 'ready') ?? [...jobs.values()].find(job => job.state === 'queued');
      if (!removable) break;
      jobs.delete(removable.key);
    }
  };
  const pump = () => {
    while (inFlight < 2) {
      const job = [...jobs.values()].find(candidate => candidate.state === 'queued');
      if (!job) break;
      if (!job.subscribers.size || !isMediaScopeCurrent(job.scope, job.getScope()) || !fetchable(job.request)) { jobs.delete(job.key); continue; }
      job.state = 'loading'; inFlight++;
      void (async () => {
        let succeeded = false;
        try { succeeded = await warm(job.request.media.url!); } catch { /* Anticipation must never fail the screen. */ }
        const owned = jobs.get(job.key) === job && job.subscribers.size > 0 && isMediaScopeCurrent(job.scope, job.getScope());
        if (!owned) { discarded++; if (jobs.get(job.key) === job) jobs.delete(job.key); }
        else if (succeeded) { warmed++; job.state = 'ready'; job.subscribers.clear(); }
        else { failed++; jobs.delete(job.key); }
        inFlight--; trim(); pump();
      })();
    }
  };
  return {
    enqueue(requests: MediaRequest[], scope: MediaScope, getScope: () => MediaScope | null) {
      if (!isMediaScopeCurrent(scope, getScope())) return () => {};
      const group = ++groupSequence, keys = new Set<string>();
      for (const request of requests.filter(fetchable).slice(0, 4)) {
        const key = JSON.stringify([scope.userId, scope.epoch, request.media.identity, request.media.url]);
        keys.add(key);
        const existing = jobs.get(key);
        if (existing) {
          existing.getScope = getScope;
          if (existing.state !== 'ready') existing.subscribers.add(group);
          else { jobs.delete(key); jobs.set(key, existing); }
        } else jobs.set(key, { key, request: { ...request, media: { ...request.media } }, scope: { ...scope }, getScope, subscribers: new Set([group]), state: 'queued' });
      }
      trim(); pump();
      return () => {
        for (const key of keys) {
          const job = jobs.get(key);
          if (!job) continue;
          job.subscribers.delete(group);
          if (job.state === 'queued' && !job.subscribers.size) jobs.delete(key);
        }
      };
    },
    dispose(scope: MediaScope) {
      for (const [key, job] of jobs) if (sameScope(job.scope, scope)) { job.subscribers.clear(); jobs.delete(key); }
    },
    // Counts only: diagnostics never expose URLs, viewer IDs or image content.
    snapshot() { return { inFlight, queued: [...jobs.values()].filter(job => job.state === 'queued').length, metadata: jobs.size, warmed, failed, discarded }; }
  };
}
