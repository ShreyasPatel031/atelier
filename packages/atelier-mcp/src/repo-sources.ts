import { access, cp, mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, relative } from "node:path";

import { bumpViewerEpoch } from "./repo-store.js";
import { CACHE_BASE, getHostedOrigin, getLocalRepoRoot, repoDir } from "./paths.js";

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function collectJsonFiles(dir: string): Promise<string[]> {
  const out: string[] = [];
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...(await collectJsonFiles(path)));
    } else if (entry.name.endsWith(".json")) {
      out.push(path);
    }
  }
  return out;
}

async function downloadFromHosted(repoId: string): Promise<string[]> {
  const origin = getHostedOrigin();
  const dir = repoDir(repoId);
  await mkdir(dir, { recursive: true });

  const overviewUrl = `${origin}/repos/${repoId}/overview.json`;
  const overviewRes = await fetch(overviewUrl);
  if (!overviewRes.ok) {
    throw new Error(`hosted:${overviewRes.status}`);
  }

  const downloaded: string[] = [];

  const indexRes = await fetch(`${origin}/repos/index.json`);
  if (indexRes.ok) {
    await mkdir(join(CACHE_BASE, "repos"), { recursive: true });
    await writeFile(join(CACHE_BASE, "repos", "index.json"), await indexRes.text());
  }

  await writeFile(join(dir, "overview.json"), await overviewRes.text());
  downloaded.push("overview.json");

  for (const file of ["module_tree.json", "metadata.json"]) {
    const res = await fetch(`${origin}/repos/${repoId}/${file}`);
    if (res.ok) {
      await writeFile(join(dir, file), await res.text());
      downloaded.push(file);
    }
  }

  const treePath = join(dir, "module_tree.json");
  if (await exists(treePath)) {
    const tree = JSON.parse(await readFile(treePath, "utf-8")) as Record<string, unknown>;
    for (const moduleId of Object.keys(tree)) {
      const res = await fetch(`${origin}/repos/${repoId}/${moduleId}.json`);
      if (res.ok) {
        await writeFile(join(dir, `${moduleId}.json`), await res.text());
        downloaded.push(`${moduleId}.json`);
      }
    }
  }

  return downloaded;
}

async function copyFromLocal(localRoot: string, repoId: string): Promise<string[]> {
  const src = join(localRoot, repoId);
  if (!(await exists(src))) {
    throw new Error(`local:missing`);
  }
  if (!(await exists(join(src, "overview.json")))) {
    throw new Error(`local:no_overview`);
  }

  const dest = repoDir(repoId);
  await mkdir(dest, { recursive: true });

  const files = await collectJsonFiles(src);
  const copied: string[] = [];
  for (const file of files) {
    const rel = relative(src, file);
    const target = join(dest, rel);
    await mkdir(dirname(target), { recursive: true });
    await cp(file, target);
    copied.push(rel);
  }
  return copied;
}

export async function ensureRepoInCache(
  repoId: string,
  options: { refresh?: boolean } = {}
): Promise<{ downloaded: string[]; source: "cache" | "hosted" | "local" }> {
  const dest = repoDir(repoId);
  const refresh = options.refresh || process.env.ATELIER_REFRESH === "1";

  if (!refresh && (await exists(join(dest, "overview.json")))) {
    return { downloaded: ["overview.json (cache)"], source: "cache" };
  }

  try {
    const downloaded = await downloadFromHosted(repoId);
    await bumpViewerEpoch(repoId);
    return { downloaded, source: "hosted" };
  } catch {
    const localRoot = getLocalRepoRoot();
    if (localRoot) {
      try {
        const downloaded = await copyFromLocal(localRoot, repoId);
        await bumpViewerEpoch(repoId);
        return { downloaded, source: "local" };
      } catch {
        // fall through
      }
    }
    throw new Error(
      `Repo '${repoId}' not found. Tried hosted (${getHostedOrigin()})` +
        (localRoot ? ` and local (${localRoot})` : "") +
        ". Set ATELIER_LOCAL_REPO_ROOT to a directory containing repo folders, or call open_viewer after the repo exists on the hosted site."
    );
  }
}

export async function listLocalRepoIds(): Promise<string[]> {
  const localRoot = getLocalRepoRoot();
  if (!localRoot || !(await exists(localRoot))) return [];

  const entries = await readdir(localRoot, { withFileTypes: true });
  const ids: string[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (await exists(join(localRoot, entry.name, "overview.json"))) {
      ids.push(entry.name);
    }
  }
  return ids.sort();
}
