export type Point = { x: number; y: number };
export type Bounds = { x: number; y: number; w: number; h: number };

export const GRID_CONFIG = {
  SIZE: 16,
} as const;

export class CoordinateService {
  static toRelativeFromWorld(childWorldPos: Point, parentWorldPos: Point): Point {
    return {
      x: childWorldPos.x - parentWorldPos.x,
      y: childWorldPos.y - parentWorldPos.y,
    };
  }

  static toWorldFromRelative(childRelativePos: Point, parentWorldPos: Point): Point {
    return {
      x: childRelativePos.x + parentWorldPos.x,
      y: childRelativePos.y + parentWorldPos.y,
    };
  }

  static snapPoint(point: Point, gridSize: number): Point {
    return {
      x: Math.round(point.x / gridSize) * gridSize,
      y: Math.round(point.y / gridSize) * gridSize,
    };
  }
}
