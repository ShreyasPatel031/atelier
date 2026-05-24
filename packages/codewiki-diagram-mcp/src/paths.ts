import { join } from "node:path";
import { homedir } from "node:os";

export const CACHE_BASE = join(homedir(), ".cache", "codewiki-diagram-mcp");

export function repoDir(repoId: string): string {
  return join(CACHE_BASE, "repos", repoId);
}

export function getHostedOrigin(): string {
  return (
    process.env.CODEWIKI_DATA_ORIGIN?.replace(/\/+$/, "") ||
    "https://app.atelier-inc.net"
  );
}

/** Optional directory of repo folders, e.g. /path/to/demo/repos */
export function getLocalRepoRoot(): string | null {
  const raw = process.env.CODEWIKI_LOCAL_REPO_ROOT?.trim();
  if (!raw) return null;
  return raw.replace(/\/+$/, "");
}
