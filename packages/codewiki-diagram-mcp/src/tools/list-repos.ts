import { z } from "zod";
import { fetchJson, getDataOrigin } from "../fetch.js";
import { listLocalRepoIds } from "../repo-sources.js";

export const listReposSchema = z.object({});

interface RepoEntry {
  id: string;
  label: string;
  description?: string;
}

export async function listRepos(): Promise<{
  content: Array<{ type: "text"; text: string }>;
}> {
  let hosted: RepoEntry[] = [];
  try {
    hosted = await fetchJson<RepoEntry[]>("repos/index.json");
  } catch {
    hosted = [];
  }

  const localIds = await listLocalRepoIds();
  const byId = new Map<string, RepoEntry>();

  for (const r of hosted) {
    byId.set(r.id, r);
  }
  for (const id of localIds) {
    if (!byId.has(id)) {
      byId.set(id, { id, label: id, description: "local only" });
    }
  }

  const origin = getDataOrigin();

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(
          {
            ok: true,
            repos: [...byId.values()]
              .sort((a, b) => a.id.localeCompare(b.id))
              .map((r) => ({
                id: r.id,
                label: r.label,
                description: r.description || "",
                viewer_url: `${origin}/?repo=${r.id}`,
              })),
          },
          null,
          2
        ),
      },
    ],
  };
}
