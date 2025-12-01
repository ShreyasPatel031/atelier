export type ViewState = {
  node?: Record<string, { x: number; y: number; w?: number; h?: number }>;
  group?: Record<string, { x: number; y: number; w?: number; h?: number }>;
  edge?: Record<string, { waypoints?: Array<{ x: number; y: number }> }>;
  layout?: Record<string, { mode?: 'FREE' | 'LOCK' }>;
};

export type Geometry = { x: number; y: number; w?: number; h?: number };

/**
 * Creates an empty ViewState
 */
export function createEmptyViewState(): ViewState {
  return {
    node: {},
    group: {},
    edge: {},
    layout: {},
  };
}
