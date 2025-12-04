import React, { useEffect, useRef, useState } from 'react';
import type { ReactFlowInstance } from 'reactflow';

interface GroupHoverPreviewProps {
  reactFlowRef: React.MutableRefObject<ReactFlowInstance | null>;
  grid?: number;
  visible: boolean;
}

const GROUP_WIDTH = 480;
const GROUP_HEIGHT = 320;

const GroupHoverPreview: React.FC<GroupHoverPreviewProps> = ({ reactFlowRef, grid = 16, visible }) => {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [zoom, setZoom] = useState<number>(1);
  const lastScreenPosRef = useRef<{ x: number; y: number } | null>(null);
  
  // Track mouse position even when not visible, so preview shows immediately when tool is selected
  useEffect(() => {
    const pane = document.querySelector('.react-flow__pane');
    if (!pane || !(pane instanceof HTMLElement)) return;
    
    const trackMouse = (e: MouseEvent) => {
      lastScreenPosRef.current = { x: e.clientX, y: e.clientY };
    };
    
    pane.addEventListener('mousemove', trackMouse);
    return () => {
      pane.removeEventListener('mousemove', trackMouse);
    };
  }, []);

  useEffect(() => {
    if (!visible) {
      setPos(null);
      return;
    }
    
    // Listen on the pane for cursor movement
    const pane = document.querySelector('.react-flow__pane');
    if (!pane || !(pane instanceof HTMLElement)) return;
    
    let raf = 0;
    const reproject = (screen: { x: number; y: number }) => {
      const rf = reactFlowRef.current;
      if (!rf) return;
      
      // Convert screen to flow coordinates
      const world = (rf as any).screenToFlowPosition
        ? (rf as any).screenToFlowPosition({ x: screen.x, y: screen.y })
        : (rf as any).project({ x: screen.x, y: screen.y });
      
      // Snap to grid
      const snap = (v: number) => Math.round(v / grid) * grid;
      
      // Center the group on the cursor (like NodeHoverPreview centers the node)
      const snappedWorld = {
        x: snap(world.x - GROUP_WIDTH / 2),
        y: snap(world.y - GROUP_HEIGHT / 2),
      };
      
      // Convert back to screen coordinates for rendering
      const flowToScreen = (rf as any).flowToScreenPosition
        ? (rf as any).flowToScreenPosition(snappedWorld)
        : null;
      
      const vp = (rf as any).getViewport ? (rf as any).getViewport() : { zoom: (rf as any).getZoom ? (rf as any).getZoom() : 1 };
      
      if (flowToScreen) {
        const rect = pane.getBoundingClientRect();
        const left = (flowToScreen as any).x - rect.left;
        const top = (flowToScreen as any).y - rect.top;
        setPos({ x: left, y: top });
        setZoom(vp.zoom || 1);
      } else {
        const rect = pane.getBoundingClientRect();
        const viewport = (rf as any).getViewport ? (rf as any).getViewport() : { x: 0, y: 0, zoom: (rf as any).getZoom ? (rf as any).getZoom() : 1 };
        const screenX = snappedWorld.x * viewport.zoom + viewport.x - rect.left;
        const screenY = snappedWorld.y * viewport.zoom + viewport.y - rect.top;
        setPos({ x: screenX, y: screenY });
        setZoom(viewport.zoom || 1);
      }
    };

    const onMove = (e: MouseEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const screen = { x: e.clientX, y: e.clientY };
        lastScreenPosRef.current = screen;
        reproject(screen);
      });
    };
    
    const onWheel = () => {
      if (!lastScreenPosRef.current) return;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        reproject(lastScreenPosRef.current!);
      });
    };
    
    // Initialize position immediately when becoming visible
    if (lastScreenPosRef.current) {
      reproject(lastScreenPosRef.current);
    } else {
      // Fallback to center of viewport
      const rect = pane.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      lastScreenPosRef.current = { x: centerX, y: centerY };
      reproject(lastScreenPosRef.current);
    }
    
    pane.addEventListener('mousemove', onMove);
    pane.addEventListener('wheel', onWheel, { passive: true });
    const onLeave = () => setPos(null);
    pane.addEventListener('mouseleave', onLeave);
    
    return () => {
      cancelAnimationFrame(raf);
      pane.removeEventListener('mousemove', onMove);
      pane.removeEventListener('wheel', onWheel as any);
      pane.removeEventListener('mouseleave', onLeave);
    };
  }, [reactFlowRef, grid, visible]);

  if (!visible || !pos) return null;
  
  const width = GROUP_WIDTH * zoom;
  const height = GROUP_HEIGHT * zoom;
  
  return (
    <div
      className="group-hover-preview"
      style={{
        position: 'absolute',
        left: pos.x,
        top: pos.y,
        width: width,
        height: height,
        borderRadius: 8 * zoom,
        border: `${1 * zoom}px solid #E4E4E4`, // E4E4E4 stroke
        background: 'rgba(228, 228, 228, 0.5)', // E4E4E4 with 50% opacity
        boxSizing: 'border-box',
        pointerEvents: 'none',
        zIndex: 100,
        transition: 'none', // No transition for smooth cursor following
      }}
    />
  );
};

export default GroupHoverPreview;
