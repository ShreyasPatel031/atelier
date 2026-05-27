export type NodeType = "module" | "component" | "external";

export interface DiagramNode {
  id: string;
  label: string;
  type: NodeType | string;
  link?: string | null;
  title?: string;
  description?: string;
  [key: string]: unknown;
}

export interface DiagramEdge {
  source: string;
  target: string;
  label?: string | null;
  title?: string;
  description?: string;
}

export interface DiagramGroup {
  id: string;
  label: string;
  nodes: string[];
  title?: string;
  description?: string;
}

export interface DiagramIR {
  direction: "TD" | "LR" | "BT" | "RL" | string;
  nodes: DiagramNode[];
  edges: DiagramEdge[];
  groups: DiagramGroup[];
}

export interface OverviewDoc {
  title: string;
  summary: string;
  diagram: DiagramIR;
  [key: string]: unknown;
}

export interface ModuleDoc {
  title: string;
  summary?: string;
  diagram?: DiagramIR;
  [key: string]: unknown;
}

export function emptyDiagram(): DiagramIR {
  return { direction: "TD", nodes: [], edges: [], groups: [] };
}

export function cloneDiagram(d: DiagramIR): DiagramIR {
  return structuredClone(d);
}

export function diagramCounts(d: DiagramIR): { nodes: number; edges: number; groups: number } {
  return { nodes: d.nodes.length, edges: d.edges.length, groups: d.groups.length };
}
