import { useState, useRef } from 'react';
import type { Node, Edge } from 'reactflow';

type Tool = 'select' | 'box' | 'connector' | 'group' | 'arrow' | 'hand';

export function useCanvasState(params?: any): any {
  const [svgPan, setSvgPan] = useState({ x: 0, y: 0 });
  const [svgZoom, setSvgZoom] = useState(1);
  const [svgContent, setSvgContent] = useState<string | null>(null);
  const [showDev, setShowDev] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [savedArchitectures, setSavedArchitectures] = useState<any[]>([]);
  const [selectedArchitectureId, setSelectedArchitectureId] = useState<string | null>(null);
  const [pendingArchitectureSelection, setPendingArchitectureSelection] = useState<string | null>(null);
  const [agentLockedArchitectureId, setAgentLockedArchitectureId] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [isLoadingArchitectures, setIsLoadingArchitectures] = useState(false);
  const [urlArchitectureProcessed, setUrlArchitectureProcessed] = useState(false);
  const [justCreatedArchId, setJustCreatedArchId] = useState<string | null>(null);
  const [hasInitialSync, setHasInitialSync] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [realtimeSyncId, setRealtimeSyncId] = useState<string | null>(null);
  const [isRealtimeSyncing, setIsRealtimeSyncing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [currentChatName, setCurrentChatName] = useState('');
  const [agentBusy, setAgentBusy] = useState(false);
  const [shareOverlay, setShareOverlay] = useState<any>(null);
  const [copyButtonState, setCopyButtonState] = useState({ copied: false });
  const [inputOverlay, setInputOverlay] = useState<any>(null);
  const [deleteOverlay, setDeleteOverlay] = useState<any>(null);
  const [notification, setNotification] = useState<any>(null);
  const [architectureOperations, setArchitectureOperations] = useState<any>({});
  const [selectedTool, setSelectedTool] = useState<Tool>('arrow');
  const [selectedNodes, setSelectedNodes] = useState<Node[]>([]);
  const [selectedEdges, setSelectedEdges] = useState<Edge[]>([]);
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);
  const [useReactFlow, setUseReactFlow] = useState(true);
  const [showElkDebug, setShowElkDebug] = useState(false);
  const [connectingFrom, setConnectingFrom] = useState<string | null>(null);
  const [connectingFromHandle, setConnectingFromHandle] = useState<string | null>(null);
  const [connectionMousePos, setConnectionMousePos] = useState<{ x: number; y: number } | null>(null);
  
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isHydratingRef = useRef(false);
  const expectedHydratedNodeCountRef = useRef(0);
  const hydratedArchitectureIdRef = useRef<string | null>(null);
  const dirtySinceRef = useRef(false);
  const remoteSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const restoredFromSnapshotRef = useRef(false);
  const skipPersistenceRef = useRef(false);
  const pendingSelectionRef = useRef<string[] | null>(null);

  return {
    svgPan, setSvgPan,
    svgZoom, setSvgZoom,
    svgContent, setSvgContent,
    showDev, setShowDev,
    sidebarCollapsed, setSidebarCollapsed,
    savedArchitectures, setSavedArchitectures,
    selectedArchitectureId, setSelectedArchitectureId,
    pendingArchitectureSelection, setPendingArchitectureSelection,
    agentLockedArchitectureId, setAgentLockedArchitectureId,
    user, setUser,
    isLoadingArchitectures, setIsLoadingArchitectures,
    urlArchitectureProcessed, setUrlArchitectureProcessed,
    justCreatedArchId, setJustCreatedArchId,
    hasInitialSync, setHasInitialSync,
    isSaving, setIsSaving,
    saveSuccess, setSaveSuccess,
    realtimeSyncId, setRealtimeSyncId,
    isRealtimeSyncing, setIsRealtimeSyncing,
    isSyncing, setIsSyncing,
    currentChatName, setCurrentChatName,
    agentBusy, setAgentBusy,
    shareOverlay, setShareOverlay,
    copyButtonState, setCopyButtonState,
    inputOverlay, setInputOverlay,
    deleteOverlay, setDeleteOverlay,
    notification, setNotification,
    architectureOperations, setArchitectureOperations,
    selectedTool, setSelectedTool,
    selectedNodes, setSelectedNodes,
    selectedEdges, setSelectedEdges,
    selectedNodeIds, setSelectedNodeIds,
    useReactFlow, setUseReactFlow,
    showElkDebug, setShowElkDebug,
    connectingFrom, setConnectingFrom,
    connectingFromHandle, setConnectingFromHandle,
    connectionMousePos, setConnectionMousePos,
    syncTimeoutRef,
    isHydratingRef,
    expectedHydratedNodeCountRef,
    hydratedArchitectureIdRef,
    dirtySinceRef,
    remoteSaveTimeoutRef,
    restoredFromSnapshotRef,
    skipPersistenceRef,
    pendingSelectionRef,
  };
}

