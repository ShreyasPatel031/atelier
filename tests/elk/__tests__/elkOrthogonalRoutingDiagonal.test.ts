import ELK from 'elkjs/lib/elk.bundled.js';
import { testEdgeCollision } from '../../../client/utils/edgeCollisionTest';

type Point = { x: number; y: number };

const NODE_WIDTH = 96;
const NODE_HEIGHT = 96;

const SOURCE_NODE = { x: 320, y: 400 };
const TARGET_NODE = { x: 432, y: 256 };
const PORT_OFFSET = 2;

const sourceX = SOURCE_NODE.x + NODE_WIDTH + PORT_OFFSET;
const sourceY = SOURCE_NODE.y + NODE_HEIGHT / 2;
const targetX = TARGET_NODE.x - PORT_OFFSET;
const targetY = TARGET_NODE.y + NODE_HEIGHT / 2;

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

const buildLayout = async () => {
  const elk = new ELK();

  const deltaY = (targetY) - (sourceY);
  const deltaX = (targetX) - (sourceX);
  const direction =
    Math.abs(deltaY) >= Math.abs(deltaX)
      ? deltaY < 0
        ? 'UP'
        : 'DOWN'
      : deltaX < 0
        ? 'UP'
        : 'RIGHT';

  const graph = {
    id: 'temp',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': direction,
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
        id: 'source',
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
        x: SOURCE_NODE.x,
        y: SOURCE_NODE.y,
        layoutOptions: {
          'elk.portConstraints': 'FIXED_POS',
          'elk.portAlignment.default': 'CENTER',
          'elk.nodePosition.fixed': 'true',
          'org.eclipse.elk.nodePosition.fixed': 'true',
        },
        ports: [
          {
            id: 'source_right',
            x: NODE_WIDTH,
            y: NODE_HEIGHT / 2,
            layoutOptions: { 'elk.port.side': 'EAST' },
            width: 0,
            height: 0,
          },
        ],
      },
      {
        id: 'target',
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
        x: TARGET_NODE.x,
        y: TARGET_NODE.y,
        layoutOptions: {
          'elk.portConstraints': 'FIXED_POS',
          'elk.portAlignment.default': 'CENTER',
          'elk.nodePosition.fixed': 'true',
          'org.eclipse.elk.nodePosition.fixed': 'true',
        },
        ports: [
          {
            id: 'target_left',
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
        sources: ['source_right'],
        targets: ['target_left'],
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

  return { adjustedPoints, transformedBendPoints, section };
};

describe('ELK orthogonal routing configuration (diagonal)', () => {
  it('produces an orthogonal polyline (no diagonal segments)', async () => {
    const { adjustedPoints, transformedBendPoints } = await buildLayout();

    expect(transformedBendPoints.length).toBeGreaterThanOrEqual(2);

    for (let i = 0; i < adjustedPoints.length - 1; i += 1) {
      const a = adjustedPoints[i];
      const b = adjustedPoints[i + 1];
      const isHorizontal = Math.abs(a.y - b.y) < 1e-6;
      const isVertical = Math.abs(a.x - b.x) < 1e-6;
      if (!isHorizontal && !isVertical) {
        throw new Error(`Segment ${i} is diagonal: (${a.x}, ${a.y}) -> (${b.x}, ${b.y})`);
      }
    }
  });

  it('does not intersect either node', async () => {
    const { adjustedPoints, transformedBendPoints } = await buildLayout();

    const rectangles = [
      {
        x: SOURCE_NODE.x,
        y: SOURCE_NODE.y,
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
      },
      {
        x: TARGET_NODE.x,
        y: TARGET_NODE.y,
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
      },
    ];

    const { collides, details } = testEdgeCollision(
      adjustedPoints[0],
      adjustedPoints[adjustedPoints.length - 1],
      transformedBendPoints,
      rectangles
    );

    if (collides) {
      throw new Error(`Edge intersects node: ${details.join('\n')}`);
    }
  });
});

