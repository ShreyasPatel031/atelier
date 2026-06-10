import { readFile, writeFile, mkdir, access } from "node:fs/promises";
import { dirname, join } from "node:path";

import type { DiagramIR, ModuleDoc, OverviewDoc } from "./diagram-types.js";
import { emptyDiagram } from "./diagram-types.js";
import { repoDir, getLocalRepoRoot } from "./paths.js";
import { notifyRepoReload } from "./repo-events.js";

interface OverviewState {
  doc: OverviewDoc;
}

interface ModuleState {
  doc: ModuleDoc;
}

interface RepoState {
  overview: OverviewState;
  modules: Map<string, ModuleState>;
}

const memory = new Map<string, RepoState>();

async function repoExists(repoId: string): Promise<boolean> {
  try {
    await access(join(repoDir(repoId), "overview.json"));
    return true;
  } catch {
    return false;
  }
}

async function readJson<T>(path: string): Promise<T> {
  const raw = await readFile(path, "utf-8");
  return JSON.parse(raw) as T;
}

async function writeJson(path: string, data: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(data, null, 4) + "\n", "utf-8");
}

async function nextViewerEpochMs(repoId: string): Promise<number> {
  const path = join(repoDir(repoId), "viewer_epoch.json");
  let next = Date.now();
  try {
    const raw = await readFile(path, "utf-8");
    const parsed = JSON.parse(raw) as { epoch?: unknown };
    if (typeof parsed.epoch === "number" && parsed.epoch >= next) {
      next = parsed.epoch + 1;
    }
  } catch {
    /* first bump */
  }
  return next;
}

async function writeViewerEpoch(repoId: string, epoch: number): Promise<void> {
  const payload = JSON.stringify({ epoch }) + "\n";
  const cachePath = join(repoDir(repoId), "viewer_epoch.json");
  await mkdir(repoDir(repoId), { recursive: true });
  await writeFile(cachePath, payload, "utf-8");

  const localRoot = getLocalRepoRoot();
  if (!localRoot) return;
  const localPath = join(localRoot, repoId, "viewer_epoch.json");
  try {
    await mkdir(dirname(localPath), { recursive: true });
    await writeFile(localPath, payload, "utf-8");
  } catch {
    /* local mirror optional */
  }
}

export async function bumpViewerEpoch(repoId: string): Promise<void> {
  const epoch = await nextViewerEpochMs(repoId);
  await writeViewerEpoch(repoId, epoch);
  notifyRepoReload(repoId, epoch);
}

export function invalidateRepo(repoId: string): void {
  memory.delete(repoId);
}

async function loadRepo(repoId: string): Promise<RepoState> {
  const cached = memory.get(repoId);
  if (cached) return cached;

  if (!(await repoExists(repoId))) {
    throw new Error(
      `Repo '${repoId}' not in local cache. Call open_viewer first to download it.`
    );
  }

  const overview = await readJson<OverviewDoc>(join(repoDir(repoId), "overview.json"));
  const state: RepoState = {
    overview: { doc: overview },
    modules: new Map(),
  };
  memory.set(repoId, state);
  return state;
}

export async function getOverview(repoId: string): Promise<{
  title: string;
  description: string;
  diagram: DiagramIR;
  doc: OverviewDoc;
}> {
  const state = await loadRepo(repoId);
  const doc = state.overview.doc;
  return {
    title: doc.title,
    description: doc.summary || "",
    diagram: doc.diagram || emptyDiagram(),
    doc,
  };
}

export async function getModule(repoId: string, moduleId: string): Promise<{
  title: string;
  description: string;
  diagram: DiagramIR;
  doc: ModuleDoc;
}> {
  const state = await loadRepo(repoId);
  let mod = state.modules.get(moduleId);
  if (!mod) {
    const path = join(repoDir(repoId), `${moduleId}.json`);
    const doc = await readJson<ModuleDoc>(path);
    mod = { doc };
    state.modules.set(moduleId, mod);
  }
  return {
    title: mod.doc.title,
    description: mod.doc.summary || "",
    diagram: mod.doc.diagram || emptyDiagram(),
    doc: mod.doc,
  };
}

export async function saveOverview(
  repoId: string,
  title: string,
  description: string,
  diagram: DiagramIR
): Promise<void> {
  const state = await loadRepo(repoId);
  state.overview.doc.title = title;
  state.overview.doc.summary = description;
  state.overview.doc.diagram = diagram;
  await writeJson(join(repoDir(repoId), "overview.json"), state.overview.doc);
  await mirrorToLocalRepo(repoId, "overview.json", state.overview.doc);
  await bumpViewerEpoch(repoId);
}

export async function saveModule(
  repoId: string,
  moduleId: string,
  diagram: DiagramIR,
  title?: string,
  description?: string
): Promise<void> {
  const { doc } = await getModule(repoId, moduleId);
  if (title !== undefined) doc.title = title;
  if (description !== undefined) doc.summary = description;
  doc.diagram = diagram;
  await writeModuleDoc(repoId, moduleId, doc);
}

async function mirrorToLocalRepo(repoId: string, relPath: string, data: unknown): Promise<void> {
  const localRoot = getLocalRepoRoot();
  if (!localRoot) return;
  const localPath = join(localRoot, repoId, relPath);
  try {
    await access(join(localRoot, repoId));
    await writeJson(localPath, data);
  } catch {
    // local repo dir missing — skip mirror
  }
}

export async function writeModuleDoc(
  repoId: string,
  moduleId: string,
  doc: ModuleDoc,
  options: { registerInTree?: boolean } = {}
): Promise<void> {
  await loadRepo(repoId);
  const registerInTree = options.registerInTree !== false;

  await writeJson(join(repoDir(repoId), `${moduleId}.json`), doc);
  await mirrorToLocalRepo(repoId, `${moduleId}.json`, doc);

  if (registerInTree) {
    const treePath = join(repoDir(repoId), "module_tree.json");
    let tree: Record<string, unknown> = {};
    try {
      tree = await readJson<Record<string, unknown>>(treePath);
    } catch {
      tree = {};
    }
    if (!tree[moduleId]) {
      tree[moduleId] = {
        path: "",
        title: doc.title,
        description: doc.summary || "",
        components: [],
        children: {},
      };
      await writeJson(treePath, tree);
      await mirrorToLocalRepo(repoId, "module_tree.json", tree);
    }
  }

  invalidateRepo(repoId);
  await bumpViewerEpoch(repoId);
}
