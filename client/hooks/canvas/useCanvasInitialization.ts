/**
 * Canvas Initialization Hook
 * 
 * Centralizes ALL canvas initialization logic that was previously in InteractiveCanvas.tsx
 * Simple flow: If local storage exists for architecture, use it; otherwise use URL/remote
 * Follows the repository rule: InteractiveCanvas should be a thin coordinator
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { User } from '@supabase/supabase-js';
// Use existing infrastructure - Orchestrator handles FREE mode via viewstate rendering
import { useElkToReactflowGraphConverter } from '../useElkToReactflowGraphConverter';
import { createViewStateSnapshot, restoreCanvasSnapshot } from '../../utils/canvasPersistence';
// Domain → ViewState → ReactFlow architecture - no direct Domain → ReactFlow rendering
import { setupWindowHelpers } from '../../utils/migrationTestHelpers';
import { createEmptyViewState } from '../../core/viewstate/ViewState';
import { CanvasArchitectureService } from '../../services/canvasArchitectureService';
import { CanvasSaveService } from '../../services/canvasSaveService';
import { SavedArchitecture } from '../../types/canvas';
import { ViewState } from '../../core/viewstate/ViewState';

interface UseCanvasStateParams {
  selectedTool: string;
  user: User | null;
  savedArchitectures: SavedArchitecture[];
  setSavedArchitectures: (architectures: SavedArchitecture[]) => void;
  selectedArchitectureId: string;
  setSelectedArchitectureId: (id: string) => void;
  setCurrentChatName: (name: string) => void;
  showNotification: (message: string, type?: string) => void;
  hideNotification: () => void;
  setDeleteOverlay: (overlay: any) => void;
  setInputOverlay: (overlay: any) => void;
  setShareOverlay: (overlay: any) => void;
  isPublicMode: boolean;
}

interface UseCanvasStateReturn {
  // Graph state
  rawGraph: any;
  nodes: any[];
  edges: any[];
  layoutVersion: number;
  
  // Setters
  setRawGraph: (newGraph: any, overrideSource?: 'ai' | 'user') => void;
  setNodes: any;
  setEdges: any;
  
  // Handlers
  onNodesChange: any;
  onEdgesChange: any;
  onConnect: any;
  handleLabelChange: any;
  handleAddNode: any;
  handleDeleteNode: any;
  handleMoveNode: any;
  handleAddEdge: any;
  handleDeleteEdge: any;
  handleGroupNodes: any;
  handleRemoveGroup: any;
  handleBatchUpdate: any;
  
  // ViewState
  viewStateRef: React.RefObject<ViewState>;
  shouldSkipFitViewRef: any;
  getViewStateSnapshot: () => ViewState | undefined;
  
  // Refs for Orchestrator
  rawGraphRef: React.MutableRefObject<any>;
  
  // Services
  architectureService: CanvasArchitectureService;
  saveService: CanvasSaveService;
  
  // Handlers from services
  handleDeleteArchitecture: any;
  handleShareArchitecture: any;
  handleEditArchitecture: any;
  
  // Persistence
  skipPersistenceRef: React.MutableRefObject<boolean>;
  restoredFromSnapshotRef: React.MutableRefObject<boolean>;
}

export function useCanvasInitialization(params: UseCanvasStateParams): UseCanvasStateReturn {
  const {
    selectedTool,
    user,
    savedArchitectures,
    setSavedArchitectures,
    selectedArchitectureId,
    setSelectedArchitectureId,
    setCurrentChatName,
    showNotification,
    hideNotification,
    setDeleteOverlay,
    setInputOverlay,
    setShareOverlay,
    isPublicMode
  } = params;

  // Add persistence skip ref and restoration tracking
  const skipPersistenceRef = useRef<boolean>(false);
  const restoredFromSnapshotRef = useRef<boolean>(false);

  // Use existing infrastructure - the ELK hook now properly bypasses ELK for FREE mode
  const {
    rawGraph,
    nodes,
    edges,
    layoutVersion,
    
    // Setters
    setRawGraph: originalSetRawGraph,
    setNodes,
    setEdges,
    
    // Handlers
    onNodesChange,
    onEdgesChange,
    onConnect,
    handleLabelChange,
    handleAddNode,
    handleDeleteNode,
    handleMoveNode,
    handleAddEdge,
    handleDeleteEdge,
    handleGroupNodes,
    handleRemoveGroup,
    handleBatchUpdate,
    
    viewStateRef,
    shouldSkipFitViewRef,
    rawGraphRef,
  } = useElkToReactflowGraphConverter({
    id: "root",
    children: [],
    edges: []
  }, selectedTool);

  // Wrap setRawGraph (removed arbitrary guards per user feedback)
  const setRawGraph = useCallback((newGraph: any, overrideSource?: 'ai' | 'user') => {
    // CRITICAL: Pass through overrideSource so AI graphs trigger ELK
    originalSetRawGraph(newGraph, overrideSource);
  }, [originalSetRawGraph]);

  // ViewState snapshot utility
  const getViewStateSnapshot = useCallback((edges?: any[]) => {
    // edges is optional - if not provided, use empty array to avoid errors
    return createViewStateSnapshot(nodes, viewStateRef, { current: false }, edges || []); // Pass edges for edge persistence
  }, [nodes, viewStateRef]);

  // Setup migration test helpers for browser console (dev only)
  // CRITICAL: Use rawGraphRef.current instead of rawGraph React state
  // because FREE mode Orchestrator updates the ref directly without React state
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') {
      setupWindowHelpers(
        () => viewStateRef.current || createEmptyViewState(),
        () => rawGraphRef.current || rawGraph  // Prefer ref, fallback to state
      );
    }
  }, [rawGraph, viewStateRef, rawGraphRef]);

  // RESTORATION LOGIC MOVED TO ORCHESTRATOR
  // This hook should NOT handle restoration - that's the Orchestrator's job
  // The Orchestrator will handle restoration during its initialization

  // Initialize architecture service
  const architectureService = useMemo(() => new CanvasArchitectureService({
    user,
    savedArchitectures,
    setSavedArchitectures,
    selectedArchitectureId,
    setSelectedArchitectureId,
    setCurrentChatName,
    setRawGraph,
    viewStateRef,
    getViewStateSnapshot,
    showNotification,
    hideNotification,
    setDeleteOverlay,
    setInputOverlay,
    setShareOverlay
  }), [
    user, 
    savedArchitectures, 
    setSavedArchitectures, 
    selectedArchitectureId, 
    setSelectedArchitectureId, 
    setCurrentChatName, 
    setRawGraph, 
    viewStateRef, 
    getViewStateSnapshot, 
    showNotification, 
    hideNotification, 
    setDeleteOverlay, 
    setInputOverlay, 
    setShareOverlay
  ]);

  // Extract handlers from architecture service
  const handleDeleteArchitecture = architectureService.handleDeleteArchitecture;
  const handleShareArchitecture = architectureService.handleShareArchitecture;
  const handleEditArchitecture = architectureService.handleEditArchitecture;

  // Initialize save service  
  const saveService = useMemo(() => new CanvasSaveService({
    user,
    selectedArchitectureId,
    savedArchitectures,
    setSavedArchitectures,
    rawGraph,
    isPublicMode,
    getViewStateSnapshot,
    isHydratingRef: { current: false }, // placeholder
    dirtySinceRef: { current: false }, // placeholder
    remoteSaveTimeoutRef: { current: null } // placeholder
  }), [
    user,
    selectedArchitectureId,
    savedArchitectures,
    setSavedArchitectures,
    rawGraph,
    isPublicMode,
    getViewStateSnapshot
  ]);

  return {
    // Graph state
    rawGraph,
    nodes,
    edges,
    layoutVersion,
    
    // Setters
    setRawGraph,
    setNodes,
    setEdges,
    
    // Handlers
    onNodesChange,
    onEdgesChange,
    onConnect,
    handleLabelChange,
    handleAddNode,
    handleDeleteNode,
    handleMoveNode,
    handleAddEdge,
    handleDeleteEdge,
    handleGroupNodes,
    handleRemoveGroup,
    handleBatchUpdate,
    
    // ViewState
    viewStateRef,
    shouldSkipFitViewRef,
    getViewStateSnapshot,
    
    // Refs for Orchestrator
    rawGraphRef,
    
    // Services
    architectureService,
    saveService,
    
    // Handlers from services
    handleDeleteArchitecture,
    handleShareArchitecture,
    handleEditArchitecture,
    
    // Persistence
    skipPersistenceRef,
    restoredFromSnapshotRef,
  };
}
