import ELK from 'elkjs/lib/elk.bundled.js';

type Point = { x: number; y: number };
type Rect = { left: number; right: number; top: number; bottom: number };

const NODE_WIDTH = 96;
const NODE_HEIGHT = 96;
const HORIZONTAL_ALLOWANCE = NODE_WIDTH / 2;
const VERTICAL_ALLOWANCE = NODE_HEIGHT / 2;
const MIN_VERTICAL_CLEARANCE = 8;

const LEFT_NODE = { x: 320, y: 400 };
const RIGHT_NODE = { x: 520, y: 400 };

const sourceX = RIGHT_NODE.x + NODE_WIDTH;
const sourceY = RIGHT_NODE.y + NODE_HEIGHT / 2;
const targetX = LEFT_NODE.x;
const targetY = LEFT_NODE.y + NODE_HEIGHT / 2;

const computeAxisTransform = (
  layoutValueA: number | undefined,
  layoutValueB: number | undefined,
  actualValueA: number,
  actualValueB: number,
  fallbackScale?: number
) => {
  if (typeof layoutValueA !== 'number' || typeof layoutValueB !== 'number') {
    return {
      scale: 1,
      offset: actualValueA - (layoutValueA ?? actualValueA),
    };
  }

  const deltaLayout = layoutValueA - layoutValueB;
  if (Math.abs(deltaLayout) < 1e-6) {
    return {
      scale: 1,
      offset: actualValueA - layoutValueA,
    };
  }

  const deltaActual = actualValueA - actualValueB;
  if (Math.abs(deltaActual) < 1e-6) {
    const scale =
      typeof fallbackScale === 'number' && Math.abs(fallbackScale) > 1e-6
        ? fallbackScale
        : 1;
    const offset = actualValueA - scale * layoutValueA;
    return { scale, offset };
  }

  const scale = deltaActual / deltaLayout;
  const offset = actualValueA - scale * layoutValueA;
  return { scale, offset };
};

const lineIntersectsLine = (p1: Point, p2: Point, p3: Point, p4: Point) => {
  const denom = (p1.x - p2.x) * (p3.y - p4.y) - (p1.y - p2.y) * (p3.x - p4.x);
  if (Math.abs(denom) < 1e-10) return false;
  const t = ((p1.x - p3.x) * (p3.y - p4.y) - (p1.y - p3.y) * (p3.x - p4.x)) / denom;
  const u = -((p1.x - p2.x) * (p1.y - p3.y) - (p1.y - p2.y) * (p1.x - p3.x)) / denom;
  return t >= 0 && t <= 1 && u >= 0 && u <= 1;
};

const segmentIntersectsRect = (p1: Point, p2: Point, rect: Rect) => {
  const epsilon = 1e-6;
  const tolerance = 0.5;

  const expanded = {
    left: rect.left - tolerance,
    right: rect.right + tolerance,
    top: rect.top - tolerance,
    bottom: rect.bottom + tolerance,
  };

  const inner = {
    left: rect.left + tolerance,
    right: rect.right - tolerance,
    top: rect.top + tolerance,
    bottom: rect.bottom - tolerance,
  };

  if ((p1.x < expanded.left && p2.x < expanded.left) || (p1.x > expanded.right && p2.x > expanded.right)) {
    return false;
  }
  if ((p1.y < expanded.top && p2.y < expanded.top) || (p1.y > expanded.bottom && p2.y > expanded.bottom)) {
    return false;
  }

  const inside =
    p1.x > inner.left && p1.x < inner.right &&
    p1.y > inner.top && p1.y < inner.bottom &&
    p2.x > inner.left && p2.x < inner.right &&
    p2.y > inner.top && p2.y < inner.bottom;
  if (inside) {
    return true;
  }

  const edges: [Point, Point][] = [
    [{ x: rect.left - epsilon, y: rect.top }, { x: rect.right + epsilon, y: rect.top }],
    [{ x: rect.right, y: rect.top - epsilon }, { x: rect.right, y: rect.bottom + epsilon }],
    [{ x: rect.left - epsilon, y: rect.bottom }, { x: rect.right + epsilon, y: rect.bottom }],
    [{ x: rect.left, y: rect.top - epsilon }, { x: rect.left, y: rect.bottom + epsilon }],
  ];

  return edges.some(([a, b]) => lineIntersectsLine(p1, p2, a, b));
};

const buildLayout = async () => {
  const elk = new ELK();

  const graph = {
    id: 'temp',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': 'UP',
      'elk.edgeRouting': 'ORTHOGONAL',
      'elk.routing.runTrueEdgeRouting': 'true',
      'elk.spacing.edgeNode': '8',
      'elk.spacing.nodeNode': '8',
      'elk.layered.nodePlacement.strategy': 'SIMPLE',
      'elk.nodePosition.fixed': 'true',
      'org.eclipse.elk.nodePosition.fixed': 'true',
      'elk.layered.considerModelOrder': 'true',
      'org.eclipse.elk.alg.libavoid.shapeBufferDistance': '2',
    },
    children: [
      {
        id: 'left',
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
        x: LEFT_NODE.x,
        y: LEFT_NODE.y,
        layoutOptions: {
          'elk.portConstraints': 'FIXED_POS',
          'elk.portAlignment.default': 'CENTER',
          'elk.nodePosition.fixed': 'true',
          'org.eclipse.elk.nodePosition.fixed': 'true',
        },
        ports: [
          {
            id: 'left_left',
            x: 0,
            y: NODE_HEIGHT / 2,
            layoutOptions: { 'elk.port.side': 'WEST' },
            width: 0,
            height: 0,
          },
          {
            id: 'left_right',
            x: NODE_WIDTH,
            y: NODE_HEIGHT / 2,
            layoutOptions: { 'elk.port.side': 'EAST' },
            width: 0,
            height: 0,
          },
        ],
      },
      {
        id: 'right',
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
        x: RIGHT_NODE.x,
        y: RIGHT_NODE.y,
        layoutOptions: {
          'elk.portConstraints': 'FIXED_POS',
          'elk.portAlignment.default': 'CENTER',
          'elk.nodePosition.fixed': 'true',
          'org.eclipse.elk.nodePosition.fixed': 'true',
        },
        ports: [
          {
            id: 'right_left',
            x: 0,
            y: NODE_HEIGHT / 2,
            layoutOptions: { 'elk.port.side': 'WEST' },
            width: 0,
            height: 0,
          },
          {
            id: 'right_right',
            x: NODE_WIDTH,
            y: NODE_HEIGHT / 2,
            layoutOptions: { 'elk.port.side': 'EAST' },
            width: 0,
            height: 0,
          },
        ],
      },
    ],
    edges: [
      {
        id: 'edge',
        sources: ['right_right'],
        targets: ['left_left'],
        layoutOptions: {
          'elk.edgeRouting': 'ORTHOGONAL',
          'elk.routing.runTrueEdgeRouting': 'true',
          'elk.orthogonalRouting.startDirection': 'EAST',
          'elk.orthogonalRouting.endDirection': 'WEST',
          'org.eclipse.elk.alg.libavoid.shapeBufferDistance': '2',
        },
        sections: [
          {
            id: 'edge_s0',
            startPoint: { x: sourceX, y: sourceY },
            endPoint: { x: targetX, y: targetY },
          },
        ],
      },
    ],
  };

  const layout = await elk.layout(graph as any);
  const edge = layout.edges?.[0];
  if (!edge || !edge.sections?.length) {
    throw new Error('ELK did not return an edge section');
  }

  const section = edge.sections[0];

  const xTransform = computeAxisTransform(section?.startPoint?.x, section?.endPoint?.x, sourceX, targetX);
  const yTransform = computeAxisTransform(
    section?.startPoint?.y,
    section?.endPoint?.y,
    sourceY,
    targetY,
    1
  );

  const applyTransform = (point: Point) => ({
    x: xTransform.scale * point.x + xTransform.offset,
    y: yTransform.scale * point.y + yTransform.offset,
  });

  const layoutPoints: Point[] = [
    section.startPoint,
    ...(section.bendPoints ?? []),
    section.endPoint,
  ];

  const transformedPoints = layoutPoints.map(applyTransform);

  const adjustedPoints = transformedPoints.map((point, index) => {
    if (index === 0) {
      return { x: sourceX, y: sourceY };
    }
    if (index === transformedPoints.length - 1) {
      return { x: targetX, y: targetY };
    }
    return { ...point };
  });

  for (let i = 1; i < adjustedPoints.length - 1; i += 1) {
    const prevLayout = layoutPoints[i - 1];
    const currLayout = layoutPoints[i];
    const prevActual = adjustedPoints[i - 1];
    const isHorizontal =
      Math.abs(currLayout.x - prevLayout.x) >=
      Math.abs(currLayout.y - prevLayout.y);

    if (isHorizontal) {
      adjustedPoints[i].y = prevActual.y;
    } else {
      adjustedPoints[i].x = prevActual.x;
    }
  }

  for (let i = adjustedPoints.length - 2; i >= 1; i -= 1) {
    const nextLayout = layoutPoints[i + 1];
    const currLayout = layoutPoints[i];
    const nextActual = adjustedPoints[i + 1];
    const isHorizontal =
      Math.abs(nextLayout.x - currLayout.x) >=
      Math.abs(nextLayout.y - currLayout.y);

    if (isHorizontal) {
      adjustedPoints[i].y = nextActual.y;
    } else {
      adjustedPoints[i].x = nextActual.x;
    }
  }

  const transformedBendPoints = adjustedPoints.slice(1, adjustedPoints.length - 1);

  return { pathPoints: adjustedPoints, transformedBendPoints, section };
};

describe('ELK orthogonal routing configuration (horizontal)', () => {
  it('stays within horizontal bounds and rises above nodes', async () => {
    const { pathPoints, transformedBendPoints, section } = await buildLayout();

    const minX = Math.min(...pathPoints.map(point => point.x));
    const maxX = Math.max(...pathPoints.map(point => point.x));
    const minY = Math.min(...pathPoints.map(point => point.y));
    const maxY = Math.max(...pathPoints.map(point => point.y));

    const leftBoundary = LEFT_NODE.x;
    const rightBoundary = RIGHT_NODE.x + NODE_WIDTH;
    const topBoundary = LEFT_NODE.y;
    const bottomBoundary = LEFT_NODE.y + NODE_HEIGHT;

    const allowedLeft = leftBoundary - HORIZONTAL_ALLOWANCE;
    const allowedRight = rightBoundary + HORIZONTAL_ALLOWANCE;
    const allowedBottom = bottomBoundary + VERTICAL_ALLOWANCE;
    const requiredTop = topBoundary - VERTICAL_ALLOWANCE;

    if (
      minX < allowedLeft ||
      maxX > allowedRight ||
      maxY > allowedBottom ||
      minY < requiredTop ||
      minY > topBoundary - MIN_VERTICAL_CLEARANCE
    ) {
      // eslint-disable-next-line no-console
      console.error('ELK routing violated horizontal/vertical constraints', {
        minX,
        maxX,
        minY,
        maxY,
        allowed: {
          minX: allowedLeft,
          maxX: allowedRight,
          minY: requiredTop,
          maxY: allowedBottom,
        },
        pathPoints,
        transformedBendPoints,
        section,
      });
    }

    expect(minX).toBeGreaterThanOrEqual(allowedLeft);
    expect(maxX).toBeLessThanOrEqual(allowedRight);
    expect(maxY).toBeLessThanOrEqual(allowedBottom);
    expect(minY).toBeGreaterThanOrEqual(requiredTop);
    expect(minY).toBeLessThanOrEqual(topBoundary - MIN_VERTICAL_CLEARANCE);
    expect(transformedBendPoints.length).toBeGreaterThanOrEqual(2);
  });

  it('does not pass through either node', async () => {
    const { pathPoints, transformedBendPoints, section } = await buildLayout();

    const rectangles: Rect[] = [
      {
        left: LEFT_NODE.x,
        right: LEFT_NODE.x + NODE_WIDTH,
        top: LEFT_NODE.y,
        bottom: LEFT_NODE.y + NODE_HEIGHT,
      },
      {
        left: RIGHT_NODE.x,
        right: RIGHT_NODE.x + NODE_WIDTH,
        top: RIGHT_NODE.y,
        bottom: RIGHT_NODE.y + NODE_HEIGHT,
      },
    ];

    const segments: [Point, Point][] = [];
    for (let i = 0; i < pathPoints.length - 1; i++) {
      segments.push([pathPoints[i], pathPoints[i + 1]]);
    }

    const internalSegments = segments.filter((_, idx) => idx !== 0 && idx !== segments.length - 1);

    const violations = segments.flatMap(([p1, p2], index) =>
      rectangles
        .filter(rect => segmentIntersectsRect(p1, p2, rect))
        .map(rect => ({ segmentIndex: index, rect }))
    );

    const relevantViolations = violations.filter(v => v.segmentIndex !== 0 && v.segmentIndex !== segments.length - 1);

    if (relevantViolations.length > 0) {
      // eslint-disable-next-line no-console
      console.error('ELK routing intersects node rectangle', {
        violations: relevantViolations,
        segments: internalSegments,
        rectangles,
        transformedBendPoints,
        section,
      });
    }

    expect(relevantViolations).toHaveLength(0);
    expect(transformedBendPoints.length).toBeGreaterThanOrEqual(2);
  });
});

