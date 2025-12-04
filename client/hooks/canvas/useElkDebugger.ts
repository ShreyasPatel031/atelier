/**
 * Hook to manage ELK Domain Graph debugger updates
 * 
 * Detects structural changes (including reparenting) and updates the debugger SVG.
 * Uses structural hash to detect changes that don't affect node count.
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { structuralHash } from '../../components/graph/utils/elk/structuralHash';
import type { RawGraph } from '../../components/graph/types/index';
import ELK from 'elkjs/lib/elk.bundled.js';
import { ensureIds } from '../../components/graph/utils/elk/ids';
import { generateSVG } from '../../utils/svgExport';
import type { ViewState } from '../../core/viewstate/ViewState';

interface UseElkDebuggerParams {
  rawGraph: RawGraph | null;
  rawGraphRef: { current: RawGraph | null };
  viewStateRef: { current: ViewState };
  nodesLength: number; // ReactFlow nodes length as proxy for changes
}

export function useElkDebugger({
  rawGraph,
  rawGraphRef,
  viewStateRef,
  nodesLength
}: UseElkDebuggerParams) {
  const [elkSvgContent, setElkSvgContent] = useState<string>('');
  const [isGeneratingSvg, setIsGeneratingSvg] = useState(false);
  const structuralHashRef = useRef<string>('');

  const generateElkSvg = useCallback(async () => {
    const currentGraph = rawGraphRef.current || rawGraph;
    if (!currentGraph || (!currentGraph.children?.length && !currentGraph.edges?.length)) {
      setElkSvgContent('');
      return;
    }
    
    setIsGeneratingSvg(true);
    try {
      // Create a deep copy of the graph
      const graphCopy = JSON.parse(JSON.stringify(currentGraph));
      
      // Apply defaults and ensure IDs
      const graphWithOptions = ensureIds(graphCopy);
      
      // Inject ViewState dimensions into graph before ELK layout
      const viewState = viewStateRef.current;
      if (viewState) {
        function injectViewStateDimensions(node: any): void {
          const id = node.id;
          const isGroup = !!(node.children && node.children.length > 0);
          
          // Get dimensions from ViewState
          if (isGroup) {
            const groupGeom = viewState.group?.[id];
            if (groupGeom?.w && groupGeom?.h) {
              node.width = groupGeom.w;
              node.height = groupGeom.h;
            }
          } else {
            const nodeGeom = viewState.node?.[id];
            if (nodeGeom?.w && nodeGeom?.h) {
              node.width = nodeGeom.w;
              node.height = nodeGeom.h;
            }
          }
          
          // Recursively process children
          if (node.children) {
            node.children.forEach((child: any) => injectViewStateDimensions(child));
          }
        }
        
        injectViewStateDimensions(graphWithOptions);
      }
      
      // Run ELK layout
      const elk = new ELK();
      const layoutedGraph = await elk.layout(graphWithOptions);
      
      // Generate SVG
      const svgContent = generateSVG(layoutedGraph);
      setElkSvgContent(svgContent);
    } catch (error) {
      console.error('Error generating ELK SVG:', error);
      setElkSvgContent('<text x="20" y="20" fill="red">Error generating SVG</text>');
    } finally {
      setIsGeneratingSvg(false);
    }
  }, [rawGraph, rawGraphRef, viewStateRef]);

  // Auto-generate SVG when graph changes
  // Watch both rawGraph (React state) and nodes (ReactFlow state) for changes
  // Also check structural hash to detect reparenting (structure changes)
  useEffect(() => {
    const currentGraph = rawGraphRef.current || rawGraph;
    if (currentGraph) {
      const currentHash = structuralHash(currentGraph);
      if (currentHash !== structuralHashRef.current) {
        structuralHashRef.current = currentHash;
        generateElkSvg();
      }
    } else {
      generateElkSvg();
    }
  }, [generateElkSvg, nodesLength, rawGraph]);
  
  // Also check for structural changes periodically (catches ref updates that don't trigger re-render)
  useEffect(() => {
    const interval = setInterval(() => {
      const currentGraph = rawGraphRef.current || rawGraph;
      if (currentGraph) {
        const currentHash = structuralHash(currentGraph);
        if (currentHash !== structuralHashRef.current) {
          structuralHashRef.current = currentHash;
          generateElkSvg();
        }
      }
    }, 500); // Check every 500ms
    
    return () => clearInterval(interval);
  }, [generateElkSvg, rawGraph]);

  return {
    elkSvgContent,
    isGeneratingSvg,
    generateElkSvg
  };
}

