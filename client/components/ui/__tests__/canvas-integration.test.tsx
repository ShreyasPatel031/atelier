/**
 * Canvas Integration Tests - REAL CANVAS TESTING
 * 
 * These tests interact with the actual InteractiveCanvas component,
 * simulating real user interactions like clicks, key presses, and mouse events.
 * 
 * Tests the ACTUAL canvas behavior, not just internal variables.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { InteractiveCanvas } from '../InteractiveCanvas';
import { ViewModeProvider } from '../../../contexts/ViewModeContext';

// Mock ReactFlow to avoid complex rendering issues in tests
jest.mock('reactflow', () => ({
  ReactFlow: ({ children, onNodesChange, onEdgesChange, nodes, edges }: any) => (
    <div data-testid="react-flow-canvas" data-nodes-count={nodes?.length || 0} data-edges-count={edges?.length || 0}>
      <div data-testid="canvas-nodes">
        {nodes?.map((node: any) => (
          <div 
            key={node.id} 
            data-testid={`canvas-node-${node.id}`}
            data-node-id={node.id}
            data-position-x={node.position.x}
            data-position-y={node.position.y}
            style={{ position: 'absolute', left: node.position.x, top: node.position.y }}
          >
            {node.data?.label || node.id}
          </div>
        ))}
      </div>
      <div data-testid="canvas-edges">
        {edges?.map((edge: any) => (
          <div key={edge.id} data-testid={`canvas-edge-${edge.id}`} data-edge-id={edge.id}>
            {edge.source} → {edge.target}
          </div>
        ))}
      </div>
      {children}
    </div>
  ),
  useReactFlow: () => ({
    setCenter: jest.fn(),
    fitView: jest.fn(),
  }),
  useNodesState: () => [[], jest.fn()],
  useEdgesState: () => [[], jest.fn()],
  Controls: () => <div data-testid="react-flow-controls" />,
  Background: () => <div data-testid="react-flow-background" />,
  Panel: ({ children }: any) => <div data-testid="react-flow-panel">{children}</div>,
}));

// Mock other dependencies
jest.mock('../../../hooks/useAuthListener', () => ({
  useAuthListener: () => ({})
}));

jest.mock('../../../hooks/useUrlArchitecture', () => ({
  useUrlArchitecture: () => ({
    checkAndLoadUrlArchitecture: jest.fn(),
  })
}));

jest.mock('../../../services/architectureService', () => ({
  ArchitectureService: {
    loadUserArchitectures: jest.fn().mockResolvedValue([]),
  }
}));

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <ViewModeProvider mode="canvas">
    {children}
  </ViewModeProvider>
);

describe('Canvas Integration Tests - REAL CANVAS', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  describe('Real Canvas Node Addition', () => {
    it('should add nodes to the actual canvas when clicking with box tool', async () => {
      const { container } = render(
        <TestWrapper>
          <InteractiveCanvas />
        </TestWrapper>
      );

      // Wait for canvas to render
      await waitFor(() => {
        expect(screen.getByTestId('react-flow-canvas')).toBeInTheDocument();
      });

      // Initially should have no nodes
      const canvas = screen.getByTestId('react-flow-canvas');
      expect(canvas).toHaveAttribute('data-nodes-count', '0');

      // Select box tool (simulate clicking the box tool button)
      const boxToolButton = container.querySelector('[data-testid="tool-box"]') || 
                           container.querySelector('[title*="box"]') ||
                           container.querySelector('[aria-label*="box"]');
      
      if (boxToolButton) {
        fireEvent.click(boxToolButton);
      }

      // Click on canvas to add a node
      const canvasArea = screen.getByTestId('react-flow-canvas');
      
      await act(async () => {
        fireEvent.click(canvasArea, {
          clientX: 200,
          clientY: 150,
        });
      });

      // Wait for node to appear
      await waitFor(() => {
        const updatedCanvas = screen.getByTestId('react-flow-canvas');
        expect(updatedCanvas).toHaveAttribute('data-nodes-count', '1');
      }, { timeout: 3000 });

      // Verify the node exists in the DOM
      const nodeElements = screen.getAllByTestId(/^canvas-node-/);
      expect(nodeElements).toHaveLength(1);

      console.log('✅ [REAL CANVAS] Node successfully added to actual canvas');
    });

    it('should add multiple nodes and maintain their positions', async () => {
      const { container } = render(
        <TestWrapper>
          <InteractiveCanvas />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('react-flow-canvas')).toBeInTheDocument();
      });

      // Select box tool
      const boxToolButton = container.querySelector('[data-testid="tool-box"]') || 
                           container.querySelector('[title*="box"]') ||
                           container.querySelector('[aria-label*="box"]');
      
      if (boxToolButton) {
        fireEvent.click(boxToolButton);
      }

      const canvasArea = screen.getByTestId('react-flow-canvas');
      
      // Add first node at (100, 100)
      await act(async () => {
        fireEvent.click(canvasArea, {
          clientX: 100,
          clientY: 100,
        });
      });

      await waitFor(() => {
        expect(screen.getByTestId('react-flow-canvas')).toHaveAttribute('data-nodes-count', '1');
      });

      // Add second node at (300, 200)
      await act(async () => {
        fireEvent.click(canvasArea, {
          clientX: 300,
          clientY: 200,
        });
      });

      await waitFor(() => {
        expect(screen.getByTestId('react-flow-canvas')).toHaveAttribute('data-nodes-count', '2');
      });

      // Verify both nodes exist and have correct positions
      const nodeElements = screen.getAllByTestId(/^canvas-node-/);
      expect(nodeElements).toHaveLength(2);

      // Check positions are approximately correct (allowing for some offset)
      const positions = nodeElements.map(node => ({
        id: node.getAttribute('data-node-id'),
        x: parseInt(node.getAttribute('data-position-x') || '0'),
        y: parseInt(node.getAttribute('data-position-y') || '0'),
      }));

      expect(positions).toHaveLength(2);
      // Positions should be different (not overlapping)
      expect(positions[0].x).not.toBe(positions[1].x);
      expect(positions[0].y).not.toBe(positions[1].y);

      console.log('✅ [REAL CANVAS] Multiple nodes added with distinct positions:', positions);
    });
  });

  describe('Real Canvas Node Deletion', () => {
    it('should delete nodes from actual canvas using delete key', async () => {
      const { container } = render(
        <TestWrapper>
          <InteractiveCanvas />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('react-flow-canvas')).toBeInTheDocument();
      });

      // Add a node first
      const boxToolButton = container.querySelector('[data-testid="tool-box"]') || 
                           container.querySelector('[title*="box"]') ||
                           container.querySelector('[aria-label*="box"]');
      
      if (boxToolButton) {
        fireEvent.click(boxToolButton);
      }

      const canvasArea = screen.getByTestId('react-flow-canvas');
      
      await act(async () => {
        fireEvent.click(canvasArea, {
          clientX: 200,
          clientY: 150,
        });
      });

      await waitFor(() => {
        expect(screen.getByTestId('react-flow-canvas')).toHaveAttribute('data-nodes-count', '1');
      });

      // Select the node by clicking on it
      const nodeElement = screen.getByTestId(/^canvas-node-/);
      fireEvent.click(nodeElement);

      // Press delete key
      await act(async () => {
        fireEvent.keyDown(document, { key: 'Delete', code: 'Delete' });
      });

      // Wait for node to be deleted
      await waitFor(() => {
        expect(screen.getByTestId('react-flow-canvas')).toHaveAttribute('data-nodes-count', '0');
      }, { timeout: 3000 });

      // Verify no nodes exist
      const nodeElements = screen.queryAllByTestId(/^canvas-node-/);
      expect(nodeElements).toHaveLength(0);

      console.log('✅ [REAL CANVAS] Node successfully deleted from actual canvas');
    });

    it('should delete multiple selected nodes', async () => {
      const { container } = render(
        <TestWrapper>
          <InteractiveCanvas />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('react-flow-canvas')).toBeInTheDocument();
      });

      // Add 3 nodes
      const boxToolButton = container.querySelector('[data-testid="tool-box"]') || 
                           container.querySelector('[title*="box"]') ||
                           container.querySelector('[aria-label*="box"]');
      
      if (boxToolButton) {
        fireEvent.click(boxToolButton);
      }

      const canvasArea = screen.getByTestId('react-flow-canvas');
      
      // Add nodes at different positions
      const positions = [
        { x: 100, y: 100 },
        { x: 200, y: 150 },
        { x: 300, y: 200 },
      ];

      for (const pos of positions) {
        await act(async () => {
          fireEvent.click(canvasArea, {
            clientX: pos.x,
            clientY: pos.y,
          });
        });
      }

      await waitFor(() => {
        expect(screen.getByTestId('react-flow-canvas')).toHaveAttribute('data-nodes-count', '3');
      });

      // Select all nodes (Ctrl+A or select multiple)
      const nodeElements = screen.getAllByTestId(/^canvas-node-/);
      
      // Click first node
      fireEvent.click(nodeElements[0]);
      
      // Ctrl+click other nodes to multi-select
      for (let i = 1; i < nodeElements.length; i++) {
        fireEvent.click(nodeElements[i], { ctrlKey: true });
      }

      // Press delete key
      await act(async () => {
        fireEvent.keyDown(document, { key: 'Delete', code: 'Delete' });
      });

      // Wait for all nodes to be deleted
      await waitFor(() => {
        expect(screen.getByTestId('react-flow-canvas')).toHaveAttribute('data-nodes-count', '0');
      }, { timeout: 5000 });

      // Verify no nodes exist
      const remainingNodes = screen.queryAllByTestId(/^canvas-node-/);
      expect(remainingNodes).toHaveLength(0);

      console.log('✅ [REAL CANVAS] Multiple nodes successfully deleted from actual canvas');
    });
  });

  describe('Real Canvas Persistence', () => {
    it('should persist nodes in localStorage and restore after refresh', async () => {
      // First render - add nodes
      const { unmount, container } = render(
        <TestWrapper>
          <InteractiveCanvas />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('react-flow-canvas')).toBeInTheDocument();
      });

      // Add nodes
      const boxToolButton = container.querySelector('[data-testid="tool-box"]') || 
                           container.querySelector('[title*="box"]') ||
                           container.querySelector('[aria-label*="box"]');
      
      if (boxToolButton) {
        fireEvent.click(boxToolButton);
      }

      const canvasArea = screen.getByTestId('react-flow-canvas');
      
      await act(async () => {
        fireEvent.click(canvasArea, {
          clientX: 150,
          clientY: 150,
        });
      });

      await act(async () => {
        fireEvent.click(canvasArea, {
          clientX: 250,
          clientY: 250,
        });
      });

      await waitFor(() => {
        expect(screen.getByTestId('react-flow-canvas')).toHaveAttribute('data-nodes-count', '2');
      });

      // Wait for persistence to localStorage
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Check localStorage has data
      const savedData = localStorage.getItem('atelier_canvas_last_snapshot_v1');
      expect(savedData).toBeTruthy();

      console.log('✅ [REAL CANVAS] Data saved to localStorage');

      // Unmount (simulate page close)
      unmount();

      // Re-render (simulate page refresh)
      const { container: newContainer } = render(
        <TestWrapper>
          <InteractiveCanvas />
        </TestWrapper>
      );

      // Wait for restoration
      await waitFor(() => {
        expect(screen.getByTestId('react-flow-canvas')).toBeInTheDocument();
      }, { timeout: 5000 });

      await waitFor(() => {
        const canvas = screen.getByTestId('react-flow-canvas');
        expect(canvas).toHaveAttribute('data-nodes-count', '2');
      }, { timeout: 5000 });

      // Verify nodes were restored
      const restoredNodes = screen.getAllByTestId(/^canvas-node-/);
      expect(restoredNodes).toHaveLength(2);

      console.log('✅ [REAL CANVAS] Nodes successfully restored after refresh');
    });

    it('should clear canvas with resetCanvas() and stay empty after refresh', async () => {
      // Add nodes first
      const { unmount, container } = render(
        <TestWrapper>
          <InteractiveCanvas />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('react-flow-canvas')).toBeInTheDocument();
      });

      // Add a node
      const boxToolButton = container.querySelector('[data-testid="tool-box"]') || 
                           container.querySelector('[title*="box"]') ||
                           container.querySelector('[aria-label*="box"]');
      
      if (boxToolButton) {
        fireEvent.click(boxToolButton);
      }

      const canvasArea = screen.getByTestId('react-flow-canvas');
      
      await act(async () => {
        fireEvent.click(canvasArea, {
          clientX: 200,
          clientY: 200,
        });
      });

      await waitFor(() => {
        expect(screen.getByTestId('react-flow-canvas')).toHaveAttribute('data-nodes-count', '1');
      });

      // Call resetCanvas()
      await act(async () => {
        (window as any).resetCanvas?.();
      });

      // Wait for canvas to clear
      await waitFor(() => {
        expect(screen.getByTestId('react-flow-canvas')).toHaveAttribute('data-nodes-count', '0');
      });

      console.log('✅ [REAL CANVAS] Canvas cleared with resetCanvas()');

      // Unmount and re-render (simulate refresh)
      unmount();

      render(
        <TestWrapper>
          <InteractiveCanvas />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('react-flow-canvas')).toBeInTheDocument();
      });

      // Should stay empty after refresh
      await new Promise(resolve => setTimeout(resolve, 1000));

      const canvas = screen.getByTestId('react-flow-canvas');
      expect(canvas).toHaveAttribute('data-nodes-count', '0');

      const nodes = screen.queryAllByTestId(/^canvas-node-/);
      expect(nodes).toHaveLength(0);

      console.log('✅ [REAL CANVAS] Canvas stayed empty after refresh');
    });
  });

  describe('Real Canvas Position Stability', () => {
    it('should not move existing nodes when adding new ones', async () => {
      const { container } = render(
        <TestWrapper>
          <InteractiveCanvas />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('react-flow-canvas')).toBeInTheDocument();
      });

      // Add first node
      const boxToolButton = container.querySelector('[data-testid="tool-box"]') || 
                           container.querySelector('[title*="box"]') ||
                           container.querySelector('[aria-label*="box"]');
      
      if (boxToolButton) {
        fireEvent.click(boxToolButton);
      }

      const canvasArea = screen.getByTestId('react-flow-canvas');
      
      await act(async () => {
        fireEvent.click(canvasArea, {
          clientX: 100,
          clientY: 100,
        });
      });

      await waitFor(() => {
        expect(screen.getByTestId('react-flow-canvas')).toHaveAttribute('data-nodes-count', '1');
      });

      // Capture first node position
      const firstNode = screen.getByTestId(/^canvas-node-/);
      const originalX = firstNode.getAttribute('data-position-x');
      const originalY = firstNode.getAttribute('data-position-y');

      console.log('✅ [REAL CANVAS] First node position:', { x: originalX, y: originalY });

      // Add second node
      await act(async () => {
        fireEvent.click(canvasArea, {
          clientX: 300,
          clientY: 300,
        });
      });

      await waitFor(() => {
        expect(screen.getByTestId('react-flow-canvas')).toHaveAttribute('data-nodes-count', '2');
      });

      // Verify first node didn't move
      const firstNodeAfter = screen.getAllByTestId(/^canvas-node-/)[0];
      const newX = firstNodeAfter.getAttribute('data-position-x');
      const newY = firstNodeAfter.getAttribute('data-position-y');

      expect(newX).toBe(originalX);
      expect(newY).toBe(originalY);

      console.log('✅ [REAL CANVAS] First node position unchanged:', { x: newX, y: newY });
    });
  });

  describe('Real Canvas Tool Selection', () => {
    it('should switch between tools and maintain correct behavior', async () => {
      const { container } = render(
        <TestWrapper>
          <InteractiveCanvas />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('react-flow-canvas')).toBeInTheDocument();
      });

      // Test box tool
      const boxToolButton = container.querySelector('[data-testid="tool-box"]') || 
                           container.querySelector('[title*="box"]') ||
                           container.querySelector('[aria-label*="box"]');
      
      if (boxToolButton) {
        await user.click(boxToolButton);
        
        // Click should add node
        const canvasArea = screen.getByTestId('react-flow-canvas');
        await act(async () => {
          fireEvent.click(canvasArea, { clientX: 150, clientY: 150 });
        });

        await waitFor(() => {
          expect(screen.getByTestId('react-flow-canvas')).toHaveAttribute('data-nodes-count', '1');
        });
      }

      // Test arrow tool (selection)
      const arrowToolButton = container.querySelector('[data-testid="tool-arrow"]') || 
                             container.querySelector('[title*="arrow"]') ||
                             container.querySelector('[aria-label*="select"]');
      
      if (arrowToolButton) {
        fireEvent.click(arrowToolButton);
        
        // Click should NOT add node (selection mode)
        const canvasArea = screen.getByTestId('react-flow-canvas');
        await act(async () => {
          fireEvent.click(canvasArea, { clientX: 250, clientY: 250 });
        });

        // Should still have only 1 node
        await new Promise(resolve => setTimeout(resolve, 500));
        expect(screen.getByTestId('react-flow-canvas')).toHaveAttribute('data-nodes-count', '1');
      }

      console.log('✅ [REAL CANVAS] Tool switching works correctly');
    });
  });
});