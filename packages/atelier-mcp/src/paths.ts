import { join, dirname } from "node:path";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";

const __pkgDir = dirname(fileURLToPath(import.meta.url));

export const CACHE_BASE = join(homedir(), ".cache", "atelier-mcp");

/** Canonical repo storage — always under ~/.cache/atelier-mcp/repos (HTTP server reads here). */
export function reposRoot(): string {
  return join(CACHE_BASE, "repos");
}

export function repoDir(repoId: string): string {
  return join(reposRoot(), repoId);
}

/** Root of the static viewer UI. */
export function getDemoRoot(): string {
  const raw = process.env.ATELIER_DEMO_ROOT?.trim();
  if (raw) return raw.replace(/\/+$/, "");
  const repos = getLocalRepoRoot();
  if (repos) return dirname(repos.replace(/\/+$/, ""));
  return join(__pkgDir, "..", "viewer");
}

/** Optional directory of repo folders, e.g. /path/to/demo/repos */
export function getLocalRepoRoot(): string | null {
  const raw = process.env.ATELIER_LOCAL_REPO_ROOT?.trim();
  if (!raw) return null;
  return raw.replace(/\/+$/, "");
}

export function getHostedOrigin(): string {
  const raw = process.env.ATELIER_DATA_ORIGIN?.trim();
  if (raw) return raw.replace(/\/+$/, "");
  return "https://app.atelier-inc.net";
}
