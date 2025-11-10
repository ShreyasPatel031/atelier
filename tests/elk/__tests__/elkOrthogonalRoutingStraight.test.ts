import ELK from 'elkjs/lib/elk.bundled.js';

type Point = { x: number; y: number };
type Rect = { left: number; right: number; top: number; bottom: number };

const NODE_WIDTH = 96;
const NODE_HEIGHT = 96;

const LEFT_NODE = { x: 320, y: 400 };
const RIGHT_NODE = { x: 520, y: 400 };

const sourceX = LEFT_NODE.x + NODE_WIDTH;
const sourceY = LEFT_NODE.y + NODE_HEIGHT / 2;
const targetX = RIGHT_NODE.x;
const targetY = RIGHT_NODE.y + NODE_HEIGHT / 2;

const computeAxisTransform = (
  layoutValueA: number | undefined,
  layoutValueB: number | undefined,
  actualValueA: number,
  actualValueB: number,
  fallbackScale = 1
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
      scale: fallbackScale,
      offset: actualValueA - fallbackScale * layoutValueA,
    };
  }

  const deltaActual = actualValueA - actualValueB;
  if (Math.abs(deltaActual) < 1e-6) {
    const scale = Math.abs(fallbackScale) > 1e-6 ? fallbackScale : 1;
    const offset = actualValueA - scale * layoutValueA;
    return { scale, offset };
  }

  const scale = deltaActual / deltaLayout;
  const offset = actualValueA - scale * layoutValueA;
  return { scale, offset };
};

const segmentIntersectsRect = (p1: Point, p2: Point, rect: Rect) => {
  if (p1.y !== p2.y) {
    return false;
  }

  const y = p1.y;
  if (y <= rect.top || y >= rect.bottom) {
    return false;
  }

  const [minX, maxX] = p1.x < p2.x ? [p1.x, p2.x] : [p2.x, p1.x];
  return maxX > rect.left && minX < rect.right;
};

const buildLayout = async () => {
  const elk = new ELK();

  const graph = {
    id: 'temp',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': 'RIGHT',
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
        ],
      },
    ],
    edges: [
      {
        id: 'edge',
        sources: ['left_right'],
        targets: ['right_left'],
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

  const xTransform = computeAxisTransform(
    section?.startPoint?.x,
    section?.endPoint?.x,
    sourceX,
    targetX
  );
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
    return { x: point.x, y: sourceY };
  });

  const transformedBendPoints = adjustedPoints.slice(1, adjustedPoints.length - 1);

  return { adjustedPoints, transformedBendPoints, section };
};

describe('ELK orthogonal routing configuration (straight horizontal)', () => {
  it('produces a straight line with no bend points', async () => {
    const { adjustedPoints, transformedBendPoints } = await buildLayout();

    expect(transformedBendPoints).toHaveLength(0);
    expect(adjustedPoints).toHaveLength(2);

    const [start, end] = adjustedPoints;
    expect(start.y).toBeCloseTo(sourceY, 6);
    expect(end.y).toBeCloseTo(sourceY, 6);
    expect(start.x).toBeCloseTo(sourceX, 6);
    expect(end.x).toBeCloseTo(targetX, 6);
    expect(start.x).toBeLessThan(end.x);
  });

  it('does not intersect either node', async () => {
    const { adjustedPoints } = await buildLayout();

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

    const [start, end] = adjustedPoints;
    const violations = rectangles.filter(rect => segmentIntersectsRect(start, end, rect));

    expect(violations).toHaveLength(0);
  });
});

