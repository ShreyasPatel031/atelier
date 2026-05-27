import { z } from "zod";

import { applyOperations, type PatchOp } from "../patch.js";
import { clearFetchCache } from "../fetch.js";
import { getLocalOrigin } from "../local-server.js";
import {
  getModule,
  getOverview,
  invalidateRepo,
  saveModule,
  saveOverview,
} from "../repo-store.js";

const patchOpSchema = z.discriminatedUnion("op", [
  z.object({
    op: z.literal("add_node"),
    id: z.string(),
    label: z.string(),
    type: z.enum(["module", "component", "external"]).optional(),
    link: z.string().nullable().optional(),
  }),
  z.object({
    op: z.literal("remove_node"),
    id: z.string(),
    cascade: z.boolean().optional(),
  }),
  z.object({
    op: z.literal("update_node"),
    id: z.string(),
    label: z.string().optional(),
    type: z.enum(["module", "component", "external"]).optional(),
    link: z.string().nullable().optional(),
    new_id: z.string().optional(),
  }),
  z.object({
    op: z.literal("add_edge"),
    source: z.string(),
    target: z.string(),
    label: z.string().nullable().optional(),
  }),
  z.object({
    op: z.literal("remove_edge"),
    source: z.string(),
    target: z.string(),
    label: z.string().nullable().optional(),
  }),
  z.object({
    op: z.literal("update_edge"),
    source: z.string(),
    target: z.string(),
    label: z.string().nullable().optional(),
    match_label: z.string().nullable().optional(),
  }),
  z.object({
    op: z.literal("add_group"),
    id: z.string(),
    label: z.string(),
    node_ids: z.array(z.string()).optional(),
  }),
  z.object({ op: z.literal("remove_group"), id: z.string() }),
  z.object({
    op: z.literal("update_group"),
    id: z.string(),
    label: z.string().optional(),
    new_id: z.string().optional(),
  }),
  z.object({
    op: z.literal("merge_groups"),
    group_ids: z.array(z.string()).min(2),
    new_id: z.string(),
    new_label: z.string(),
  }),
  z.object({
    op: z.literal("move_nodes"),
    node_ids: z.array(z.string()).min(1),
    to_group: z.string().nullable().optional(),
  }),
  z.object({
    op: z.literal("set_direction"),
    direction: z.enum(["TD", "LR", "BT", "RL"]),
  }),
  z.object({ op: z.literal("set_title"), title: z.string() }),
  z.object({ op: z.literal("set_description"), description: z.string() }),
]);

export const patchDiagramSchema = z.object({
  repo_id: z.string(),
  target: z.string().default("overview"),
  operations: z.array(patchOpSchema).min(1),
  dry_run: z.boolean().default(false),
});

export async function patchDiagram(args: {
  repo_id: string;
  target: string;
  operations: PatchOp[];
  dry_run: boolean;
}): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  const { repo_id, target, operations, dry_run } = args;

  const isOverview = target === "overview";
  const source = isOverview
    ? await getOverview(repo_id)
    : await getModule(repo_id, target);

  const { diagram, result, meta } = applyOperations(source.diagram, operations, {
    title: source.title,
    description: source.description,
  });

  if (dry_run) {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ ok: true, dry_run: true, target, ...result }, null, 2),
        },
      ],
    };
  }

  const newTitle = meta.title ?? source.title;
  const newDescription = meta.description ?? source.description;

  if (isOverview) {
    await saveOverview(repo_id, newTitle, newDescription, diagram);
  } else {
    await saveModule(repo_id, target, diagram, newTitle, newDescription);
  }

  invalidateRepo(repo_id);
  clearFetchCache();

  const origin = getLocalOrigin() || "http://127.0.0.1:9892";

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(
          {
            ok: true,
            repo_id,
            target,
            ...result,
            title: newTitle,
            description: newDescription,
            viewer_url: `${origin}/?repo=${repo_id}`,
            hint: "Viewer will hot-reload via viewer_epoch.json",
          },
          null,
          2
        ),
      },
    ],
  };
}
