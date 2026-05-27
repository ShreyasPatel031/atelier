import { z } from "zod";
import { fetchJson, getDataOrigin } from "../fetch.js";

export const getDiagramSchema = z.object({
  repo_id: z.string().describe("Repository id (e.g. 'persona-selection-model', 'crewai')"),
  target: z
    .string()
    .default("overview")
    .describe(
      "'overview' for the top-level diagram, '__inventory__' for a compact summary of all modules, or a module_id for a specific module's diagram"
    ),
});

interface DiagramNode {
  id: string;
  label: string;
  type: string;
  link?: string | null;
  [key: string]: unknown;
}

interface DiagramEdge {
  source: string;
  target: string;
  label?: string | null;
}

interface DiagramGroup {
  id: string;
  label: string;
  nodes: string[];
}

interface DiagramIR {
  direction: string;
  nodes: DiagramNode[];
  edges: DiagramEdge[];
  groups: DiagramGroup[];
}

interface OverviewJson {
  title: string;
  summary: string;
  diagram: DiagramIR;
}

interface ModuleTreeEntry {
  path?: string;
  title?: string;
  description?: string;
  components?: string[];
  diagram?: DiagramIR;
  children?: Record<string, ModuleTreeEntry>;
}

interface ModuleDocJson {
  title: string;
  summary?: string;
  diagram?: DiagramIR;
  [key: string]: unknown;
}

function repoPath(repoId: string, file: string): string {
  return `repos/${repoId}/${file}`;
}

function countModules(
  tree: Record<string, ModuleTreeEntry>
): Array<{
  id: string;
  title: string;
  has_diagram: boolean;
  nodes: number;
  edges: number;
  groups: number;
  children: string[];
}> {
  const result: Array<{
    id: string;
    title: string;
    has_diagram: boolean;
    nodes: number;
    edges: number;
    groups: number;
    children: string[];
  }> = [];

  for (const [id, entry] of Object.entries(tree)) {
    const d = entry.diagram;
    result.push({
      id,
      title: entry.title || id,
      has_diagram: !!d,
      nodes: d?.nodes?.length ?? 0,
      edges: d?.edges?.length ?? 0,
      groups: d?.groups?.length ?? 0,
      children: Object.keys(entry.children || {}),
    });
  }
  return result;
}

async function getOverview(
  repoId: string
): Promise<{ type: "text"; text: string }> {
  const overview = await fetchJson<OverviewJson>(
    repoPath(repoId, "overview.json")
  );

  return {
    type: "text" as const,
    text: JSON.stringify(
      {
        ok: true,
        repo_id: repoId,
        target: "overview",
        title: overview.title,
        description: overview.summary,
        diagram: overview.diagram,
        viewer_url: `${getDataOrigin()}/?repo=${repoId}`,
      },
      null,
      2
    ),
  };
}

async function getInventory(
  repoId: string
): Promise<{ type: "text"; text: string }> {
  const [overview, tree] = await Promise.all([
    fetchJson<OverviewJson>(repoPath(repoId, "overview.json")),
    fetchJson<Record<string, ModuleTreeEntry>>(
      repoPath(repoId, "module_tree.json")
    ).catch(() => ({} as Record<string, ModuleTreeEntry>)),
  ]);

  const ov = overview.diagram;
  return {
    type: "text" as const,
    text: JSON.stringify(
      {
        ok: true,
        repo_id: repoId,
        target: "__inventory__",
        overview: {
          title: overview.title,
          description: overview.summary,
          direction: ov.direction,
          nodes: ov.nodes.length,
          edges: ov.edges.length,
          groups: ov.groups.length,
        },
        modules: countModules(tree),
        viewer_url: `${getDataOrigin()}/?repo=${repoId}`,
      },
      null,
      2
    ),
  };
}

async function getModule(
  repoId: string,
  moduleId: string
): Promise<{ type: "text"; text: string }> {
  const doc = await fetchJson<ModuleDocJson>(
    repoPath(repoId, `${moduleId}.json`)
  );

  return {
    type: "text" as const,
    text: JSON.stringify(
      {
        ok: true,
        repo_id: repoId,
        target: moduleId,
        title: doc.title,
        description: doc.summary || "",
        diagram: doc.diagram || null,
        viewer_url: `${getDataOrigin()}/?repo=${repoId}`,
      },
      null,
      2
    ),
  };
}

export async function getDiagram(args: {
  repo_id: string;
  target: string;
}): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  const { repo_id, target } = args;

  let result: { type: "text"; text: string };

  if (target === "overview") {
    result = await getOverview(repo_id);
  } else if (target === "__inventory__") {
    result = await getInventory(repo_id);
  } else {
    result = await getModule(repo_id, target);
  }

  return { content: [result] };
}
