/**
 * Edge collision detection utilities
 * Tests if a rendered edge path intersects with node rectangles
 */

export interface Point {
  x: number;
  y: number;
}

export interface Rectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Test if a line segment intersects with a rectangle
 */
export function lineIntersectsRect(p1: Point, p2: Point, rect: Rectangle): boolean {
  const left = rect.x;
  const right = rect.x + rect.width;
  const top = rect.y;
  const bottom = rect.y + rect.height;

  // First, check if the segment lies completely outside on one side
  if ((p1.x < left && p2.x < left) || (p1.x > right && p2.x > right)) {
    return false;
  }
  if ((p1.y < top && p2.y < top) || (p1.y > bottom && p2.y > bottom)) {
    return false;
  }

  // If both points are inside, treat as non-intersection to allow hugging edges
  const inside =
    p1.x > left && p1.x < right && p1.y > top && p1.y < bottom &&
    p2.x > left && p2.x < right && p2.y > top && p2.y < bottom;
  if (inside) {
    return false;
  }

  // Otherwise, check actual edge intersections with a tiny epsilon
  const epsilon = 1e-6;
  const horizontal = [
    lineIntersectsLine(p1, p2, { x: left - epsilon, y: top }, { x: right + epsilon, y: top }),
    lineIntersectsLine(p1, p2, { x: left - epsilon, y: bottom }, { x: right + epsilon, y: bottom }),
  ];
  if (horizontal.some(Boolean)) return true;

  const vertical = [
    lineIntersectsLine(p1, p2, { x: left, y: top - epsilon }, { x: left, y: bottom + epsilon }),
    lineIntersectsLine(p1, p2, { x: right, y: top - epsilon }, { x: right, y: bottom + epsilon }),
  ];
  return vertical.some(Boolean);
}

/**
 * Test if two line segments intersect
 */
export function lineIntersectsLine(p1: Point, p2: Point, p3: Point, p4: Point): boolean {
  const denom = (p1.x - p2.x) * (p3.y - p4.y) - (p1.y - p2.y) * (p3.x - p4.x);
  if (Math.abs(denom) < 1e-10) return false; // parallel lines
  
  const t = ((p1.x - p3.x) * (p3.y - p4.y) - (p1.y - p3.y) * (p3.x - p4.x)) / denom;
  const u = -((p1.x - p2.x) * (p1.y - p3.y) - (p1.y - p2.y) * (p1.x - p3.x)) / denom;
  
  return t >= 0 && t <= 1 && u >= 0 && u <= 1;
}

/**
 * Test if an edge path (with bend points) collides with any nodes
 */
export function testEdgeCollision(
  startPoint: Point,
  endPoint: Point,
  bendPoints: Point[],
  nodes: Rectangle[]
): { collides: boolean; details: string[] } {
  // Create full path: start → bend points → end
  const fullPath = [startPoint, ...bendPoints, endPoint];
  
  const details: string[] = [];
  let collides = false;
  
  // Check each path segment against each node
  for (let i = 0; i < fullPath.length - 1; i++) {
    const p1 = fullPath[i];
    const p2 = fullPath[i + 1];
    
    for (let j = 0; j < nodes.length; j++) {
      const node = nodes[j];
      
      if (lineIntersectsRect(p1, p2, node)) {
        details.push(`❌ Segment ${i} (${p1.x.toFixed(1)},${p1.y.toFixed(1)}) → (${p2.x.toFixed(1)},${p2.y.toFixed(1)}) intersects node ${j} at (${node.x},${node.y})`);
        collides = true;
      }
    }
  }
  
  if (!collides) {
    details.push('✅ Edge successfully routes around all nodes');
  }
  
  return { collides, details };
}
