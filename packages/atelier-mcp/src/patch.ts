import type { DiagramEdge, DiagramIR, NodeType } from "./diagram-types.js";
import { cloneDiagram, diagramCounts } from "./diagram-types.js";

export interface PatchResult {
  applied: number;
  operations: string[];
  counts_before: { nodes: number; edges: number; groups: number };
  counts_after: { nodes: number; edges: number; groups: number };
  title?: string;
  description?: string;
}

export type PatchOp =
  | { op: "add_node"; id: string; label: string; type?: NodeType; link?: string | null }
  | { op: "remove_node"; id: string; cascade?: boolean }
  | {
      op: "update_node";
      id: string;
      label?: string;
      type?: NodeType;
      link?: string | null;
      new_id?: string;
    }
  | { op: "add_edge"; source: string; target: string; label?: string | null }
  | { op: "remove_edge"; source: string; target: string; label?: string | null }
  | {
      op: "update_edge";
      source: string;
      target: string;
      label?: string | null;
      match_label?: string | null;
    }
  | { op: "add_group"; id: string; label: string; node_ids?: string[] }
  | { op: "remove_group"; id: string }
  | { op: "update_group"; id: string; label?: string; new_id?: string }
  | { op: "merge_groups"; group_ids: string[]; new_id: string; new_label: string }
  | { op: "move_nodes"; node_ids: string[]; to_group?: string | null }
  | { op: "set_direction"; direction: "TD" | "LR" | "BT" | "RL" }
  | { op: "set_title"; title: string }
  | { op: "set_description"; description: string };

type EdgeKey = [string, string, string | null | undefined];

function edgeKey(e: DiagramEdge): EdgeKey {
  return [e.source, e.target, e.label ?? null];
}

function validateAll(diagram: DiagramIR, operations: PatchOp[]): void {
  const nodeIds = new Set(diagram.nodes.map((n) => n.id));
  const groupIds = new Set(diagram.groups.map((g) => g.id));
  const edges = new Set(diagram.edges.map((e) => JSON.stringify(edgeKey(e))));

  for (let i = 0; i < operations.length; i++) {
    const op = operations[i];
    const prefix = `op[${i}] ${op.op}`;

    switch (op.op) {
      case "add_node":
        if (nodeIds.has(op.id)) throw new Error(`${prefix}: node id '${op.id}' already exists`);
        nodeIds.add(op.id);
        break;
      case "remove_node": {
        if (!nodeIds.has(op.id)) throw new Error(`${prefix}: node id '${op.id}' not found`);
        nodeIds.delete(op.id);
        if (op.cascade !== false) {
          for (const key of [...edges]) {
            const [s, t] = JSON.parse(key) as EdgeKey;
            if (s === op.id || t === op.id) edges.delete(key);
          }
        }
        break;
      }
      case "update_node": {
        if (!nodeIds.has(op.id)) throw new Error(`${prefix}: node id '${op.id}' not found`);
        if (op.new_id && op.new_id !== op.id) {
          if (nodeIds.has(op.new_id)) throw new Error(`${prefix}: rename target '${op.new_id}' already exists`);
          nodeIds.delete(op.id);
          nodeIds.add(op.new_id);
          const next = new Set<string>();
          for (const key of edges) {
            const [s, t, l] = JSON.parse(key) as EdgeKey;
            next.add(JSON.stringify([s === op.id ? op.new_id : s, t === op.id ? op.new_id : t, l]));
          }
          edges.clear();
          for (const k of next) edges.add(k);
        }
        break;
      }
      case "add_edge":
        if (!nodeIds.has(op.source)) throw new Error(`${prefix}: source '${op.source}' not in nodes`);
        if (!nodeIds.has(op.target)) throw new Error(`${prefix}: target '${op.target}' not in nodes`);
        edges.add(JSON.stringify([op.source, op.target, op.label ?? null]));
        break;
      case "remove_edge": {
        const match = [...edges].find((key) => {
          const [s, t, l] = JSON.parse(key) as EdgeKey;
          return s === op.source && t === op.target && (op.label == null || l === op.label);
        });
        if (!match) throw new Error(`${prefix}: no edge ${op.source}->${op.target}`);
        edges.delete(match);
        break;
      }
      case "update_edge": {
        const match = [...edges].find((key) => {
          const [s, t, l] = JSON.parse(key) as EdgeKey;
          return s === op.source && t === op.target && (op.match_label == null || l === op.match_label);
        });
        if (!match) throw new Error(`${prefix}: no edge ${op.source}->${op.target} to update`);
        break;
      }
      case "add_group":
        if (groupIds.has(op.id)) throw new Error(`${prefix}: group id '${op.id}' already exists`);
        for (const nid of op.node_ids || []) {
          if (!nodeIds.has(nid)) throw new Error(`${prefix}: group node '${nid}' not in nodes`);
        }
        groupIds.add(op.id);
        break;
      case "remove_group":
        if (!groupIds.has(op.id)) throw new Error(`${prefix}: group id '${op.id}' not found`);
        groupIds.delete(op.id);
        break;
      case "update_group":
        if (!groupIds.has(op.id)) throw new Error(`${prefix}: group id '${op.id}' not found`);
        if (op.new_id && op.new_id !== op.id) {
          if (groupIds.has(op.new_id)) throw new Error(`${prefix}: rename target '${op.new_id}' already exists`);
          groupIds.delete(op.id);
          groupIds.add(op.new_id);
        }
        break;
      case "merge_groups": {
        const missing = op.group_ids.filter((g) => !groupIds.has(g));
        if (missing.length) throw new Error(`${prefix}: groups not found: ${missing.join(", ")}`);
        for (const g of op.group_ids) groupIds.delete(g);
        if (groupIds.has(op.new_id)) throw new Error(`${prefix}: new_id '${op.new_id}' already exists`);
        groupIds.add(op.new_id);
        break;
      }
      case "move_nodes":
        for (const nid of op.node_ids) {
          if (!nodeIds.has(nid)) throw new Error(`${prefix}: node '${nid}' not in nodes`);
        }
        if (op.to_group != null && !groupIds.has(op.to_group)) {
          throw new Error(`${prefix}: target group '${op.to_group}' not found`);
        }
        break;
      default:
        break;
    }
  }
}

function applyOne(d: DiagramIR, op: PatchOp, meta: Record<string, string>): void {
  switch (op.op) {
    case "add_node":
      d.nodes.push({ id: op.id, label: op.label, type: op.type || "component", link: op.link ?? null });
      break;
    case "remove_node":
      d.nodes = d.nodes.filter((n) => n.id !== op.id);
      if (op.cascade !== false) {
        d.edges = d.edges.filter((e) => e.source !== op.id && e.target !== op.id);
        for (const g of d.groups) g.nodes = g.nodes.filter((n) => n !== op.id);
      }
      break;
    case "update_node": {
      const node = d.nodes.find((n) => n.id === op.id);
      if (!node) return;
      if (op.label != null) node.label = op.label;
      if (op.type != null) node.type = op.type;
      if (op.link !== undefined) node.link = op.link || null;
      if (op.new_id && op.new_id !== op.id) {
        const old = node.id;
        node.id = op.new_id;
        for (const e of d.edges) {
          if (e.source === old) e.source = op.new_id;
          if (e.target === old) e.target = op.new_id;
        }
        for (const g of d.groups) {
          g.nodes = g.nodes.map((n) => (n === old ? op.new_id! : n));
        }
      }
      break;
    }
    case "add_edge":
      d.edges.push({ source: op.source, target: op.target, label: op.label ?? null });
      break;
    case "remove_edge": {
      let removed = false;
      d.edges = d.edges.filter((e) => {
        if (
          !removed &&
          e.source === op.source &&
          e.target === op.target &&
          (op.label == null || e.label === op.label)
        ) {
          removed = true;
          return false;
        }
        return true;
      });
      break;
    }
    case "update_edge":
      for (const e of d.edges) {
        if (
          e.source === op.source &&
          e.target === op.target &&
          (op.match_label == null || e.label === op.match_label)
        ) {
          e.label = op.label ?? null;
          break;
        }
      }
      break;
    case "add_group":
      d.groups.push({ id: op.id, label: op.label, nodes: [...(op.node_ids || [])] });
      break;
    case "remove_group":
      d.groups = d.groups.filter((g) => g.id !== op.id);
      break;
    case "update_group": {
      const g = d.groups.find((x) => x.id === op.id);
      if (!g) return;
      if (op.label != null) g.label = op.label;
      if (op.new_id && op.new_id !== op.id) g.id = op.new_id;
      break;
    }
    case "merge_groups": {
      const targetSet = new Set(op.group_ids);
      const mergedNodes: string[] = [];
      const seen = new Set<string>();
      const kept = [];
      for (const g of d.groups) {
        if (targetSet.has(g.id)) {
          for (const n of g.nodes) {
            if (!seen.has(n)) {
              seen.add(n);
              mergedNodes.push(n);
            }
          }
        } else {
          kept.push(g);
        }
      }
      kept.push({ id: op.new_id, label: op.new_label, nodes: mergedNodes });
      d.groups = kept;
      break;
    }
    case "move_nodes": {
      const moving = new Set(op.node_ids);
      for (const g of d.groups) {
        g.nodes = g.nodes.filter((n) => !moving.has(n));
      }
      if (op.to_group != null) {
        const target = d.groups.find((x) => x.id === op.to_group);
        if (target) {
          const existing = new Set(target.nodes);
          for (const nid of op.node_ids) {
            if (!existing.has(nid)) {
              target.nodes.push(nid);
              existing.add(nid);
            }
          }
        }
      }
      break;
    }
    case "set_direction":
      d.direction = op.direction;
      break;
    case "set_title":
      meta.title = op.title;
      break;
    case "set_description":
      meta.description = op.description;
      break;
  }
}

export function applyOperations(
  diagram: DiagramIR,
  operations: PatchOp[],
  meta?: { title?: string; description?: string }
): { diagram: DiagramIR; result: PatchResult; meta: Record<string, string> } {
  const countsBefore = diagramCounts(diagram);
  validateAll(diagram, operations);

  const working = cloneDiagram(diagram);
  const outMeta: Record<string, string> = {};
  for (const op of operations) {
    applyOne(working, op, outMeta);
  }

  const newTitle = outMeta.title ?? meta?.title;
  const newDescription = outMeta.description ?? meta?.description;

  return {
    diagram: working,
    meta: outMeta,
    result: {
      applied: operations.length,
      operations: operations.map((o) => o.op),
      counts_before: countsBefore,
      counts_after: diagramCounts(working),
      title: newTitle,
      description: newDescription,
    },
  };
}
