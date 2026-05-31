import { z } from "zod";

import type { DiagramIR } from "../diagram-types.js";
import { clearFetchCache } from "../fetch.js";
import { writeModuleDoc } from "../repo-store.js";

const diagramSchema = z.object({
  direction: z.enum(["TD", "LR", "BT", "RL"]).or(z.string()),
  nodes: z.array(z.record(z.unknown())),
  edges: z.array(z.record(z.unknown())),
  groups: z.array(z.record(z.unknown())),
});

export const writeModuleDocSchema = z.object({
  repo_id: z.string(),
  module_id: z.string(),
  title: z.string(),
  summary: z.string().default(""),
  diagram: diagramSchema,
  register_in_tree: z.boolean().default(true),
});

export async function writeModuleDocTool(
  args: z.infer<typeof writeModuleDocSchema>
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  const diagram = args.diagram as unknown as DiagramIR;
  await writeModuleDoc(
    args.repo_id,
    args.module_id,
    {
      title: args.title,
      summary: args.summary,
      diagram,
    },
    { registerInTree: args.register_in_tree }
  );
  clearFetchCache();

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(
          {
            ok: true,
            repo_id: args.repo_id,
            module_id: args.module_id,
            wrote: `${args.module_id}.json`,
            hint: `Set overview node link='${args.module_id}' and type='module' to make it clickable.`,
          },
          null,
          2
        ),
      },
    ],
  };
}
