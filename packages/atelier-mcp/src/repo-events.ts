import type { ServerResponse } from "node:http";

/** repo_id → open SSE response handles */
const subscribers = new Map<string, Set<ServerResponse>>();

export function subscribeRepoEvents(repoId: string, res: ServerResponse): () => void {
  let set = subscribers.get(repoId);
  if (!set) {
    set = new Set();
    subscribers.set(repoId, set);
  }
  set.add(res);
  return () => {
    set!.delete(res);
    if (set!.size === 0) subscribers.delete(repoId);
  };
}

/** Push reload to every browser tab subscribed for this repo (instant, no poll). */
export function notifyRepoReload(repoId: string, epoch: number): void {
  const set = subscribers.get(repoId);
  if (!set?.size) return;
  const payload = JSON.stringify({ repo_id: repoId, epoch });
  for (const res of set) {
    try {
      res.write(`event: reload\ndata: ${payload}\n\n`);
    } catch {
      set.delete(res);
    }
  }
}
