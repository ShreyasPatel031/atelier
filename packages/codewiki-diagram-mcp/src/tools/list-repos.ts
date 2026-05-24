import { z } from "zod";
import { fetchJson } from "../fetch.js";

export const listReposSchema = z.object({});

interface RepoEntry {
  id: string;
  label: string;
  description?: string;
}

export async function listRepos(): Promise<{
  content: Array<{ type: "text"; text: string }>;
}> {
  const repos = await fetchJson<RepoEntry[]>("repos/index.json");

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(
          {
            ok: true,
            repos: repos.map((r) => ({
              id: r.id,
              label: r.label,
              description: r.description || "",
              viewer_url: `https://app.atelier-inc.net/?repo=${r.id}`,
            })),
          },
          null,
          2
        ),
      },
    ],
  };
}
