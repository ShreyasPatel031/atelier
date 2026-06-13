import { watch, type FSWatcher } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { notifyRepoReload } from "./repo-events.js";
import { repoDir } from "./paths.js";

const watchers = new Map<string, FSWatcher>();

async function readEpochMs(repoId: string): Promise<number | null> {
  try {
    const raw = await readFile(join(repoDir(repoId), "viewer_epoch.json"), "utf-8");
    const parsed = JSON.parse(raw) as { epoch?: unknown };
    return typeof parsed.epoch === "number" ? parsed.epoch : null;
  } catch {
    return null;
  }
}

/** Watch viewer_epoch.json so patches from any process push SSE reloads. */
export function ensureEpochWatcher(repoId: string): void {
  if (watchers.has(repoId)) return;

  const epochPath = join(repoDir(repoId), "viewer_epoch.json");
  let debounce: ReturnType<typeof setTimeout> | null = null;

  const push = () => {
    if (debounce) clearTimeout(debounce);
    debounce = setTimeout(() => {
      void (async () => {
        const epoch = await readEpochMs(repoId);
        if (epoch != null) notifyRepoReload(repoId, epoch);
      })();
    }, 50);
  };

  try {
    const w = watch(epochPath, { persistent: false }, push);
    watchers.set(repoId, w);
  } catch {
    try {
      const dirPath = repoDir(repoId);
      const w = watch(dirPath, { persistent: false }, (_event, filename) => {
        if (filename === "viewer_epoch.json") push();
      });
      watchers.set(repoId, w);
    } catch {
      /* repo dir not created yet */
    }
  }
}
