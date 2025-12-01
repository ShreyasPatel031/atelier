import React, { createContext, useContext, useMemo } from 'react';

// Simplified view mode - just use path-based routing, no complex environment logic
export type ViewMode = 'embed' | 'canvas' | 'auth';

export interface LibavoidOptions {
  shapeBufferDistance: number; // edge-to-node spacing
  portEdgeSpacing: number; // spacing between edges at the same port (in pixels)
  routingType: 'orthogonal' | 'polyline';
  hateCrossings: boolean;
  nudgeOrthSegments: boolean;
  nudgeSharedPaths: boolean;
  nudgeTouchingColinear: boolean;
  segmentPenalty: number;
  bendPenalty: number;
  crossingPenalty: number;
  sharedPathPenalty: number;
  // idealNudgingDistance: The PRIMARY parameter for uniform spacing between parallel edges
  // MUST match portEdgeSpacing for uniform spacing
  idealNudgingDistance?: number;
}

export interface ViewModeConfig {
  mode: ViewMode;
  isEmbedded: boolean;
  
  // Authentication & User Features
  requiresAuth: boolean;
  showSaveButton: boolean;
  showEditButton: boolean;
  showProfileSection: boolean;
  showSidebar: boolean;
  
  // Content & Collaboration Features
  allowSharing: boolean;
  allowExporting: boolean;
  allowArchitectureManagement: boolean;
  
  // UI Features
  showDevPanel: boolean;
  showSettings: boolean;
  showChatPanel: boolean;
  showAgentIcon: boolean;
  showChatbox: boolean;

  // Libavoid routing defaults (for FREE mode)
  libavoidDefaults: LibavoidOptions;
}

const VIEW_MODE_CONFIGS: Record<ViewMode, Omit<ViewModeConfig, 'mode' | 'isEmbedded'>> = {
  embed: {
    requiresAuth: false,
    showSaveButton: false,
    showEditButton: true,
    showProfileSection: false,
    showSidebar: true,
    allowSharing: true,
    allowExporting: true,
    allowArchitectureManagement: false,
    showDevPanel: false,
    showSettings: false,
    showChatPanel: false,
    showAgentIcon: false,
    showChatbox: true, // Only chatbox in embed
    libavoidDefaults: {
      shapeBufferDistance: 24,
      portEdgeSpacing: 16,
      routingType: 'orthogonal',
      hateCrossings: true,
      nudgeOrthSegments: false,
      nudgeSharedPaths: true,
      nudgeTouchingColinear: false,
      segmentPenalty: 3,
      bendPenalty: 10,
      crossingPenalty: 100,
      sharedPathPenalty: 100000,
      idealNudgingDistance: 16, // MUST match portEdgeSpacing for uniform spacing
    },
  },
  canvas: {
    requiresAuth: false,
    showSaveButton: true,
    showEditButton: false,
    showProfileSection: true,
    showSidebar: true,
    allowSharing: true,
    allowExporting: true,
    allowArchitectureManagement: false,
    showDevPanel: false,
    showSettings: false,
    showChatPanel: true, // Full chat panel
    showAgentIcon: true,
    showChatbox: false,
    libavoidDefaults: {
      shapeBufferDistance: 8, // Reduced from 24 - smaller spacing makes routing work better
      portEdgeSpacing: 16,
      routingType: 'orthogonal',
      hateCrossings: true,
      nudgeOrthSegments: false,
      nudgeSharedPaths: true,
      nudgeTouchingColinear: false,
      segmentPenalty: 3,
      bendPenalty: 10,
      crossingPenalty: 100,
      sharedPathPenalty: 100000,
      idealNudgingDistance: 16, // MUST match portEdgeSpacing for uniform spacing
    },
  },
  auth: {
    requiresAuth: true,
    showSaveButton: true,
    showEditButton: false,
    showProfileSection: true,
    showSidebar: true,
    allowSharing: true,
    allowExporting: true,
    allowArchitectureManagement: true,
    showDevPanel: true,
    showSettings: true,
    showChatPanel: true, // Full chat panel
    showAgentIcon: true,
    showChatbox: false,
    libavoidDefaults: {
      shapeBufferDistance: 24,
      portEdgeSpacing: 16,
      routingType: 'orthogonal',
      hateCrossings: true,
      nudgeOrthSegments: false,
      nudgeSharedPaths: true,
      nudgeTouchingColinear: false,
      segmentPenalty: 3,
      bendPenalty: 10,
      crossingPenalty: 100,
      sharedPathPenalty: 100000,
      idealNudgingDistance: 16, // MUST match portEdgeSpacing for uniform spacing
    },
  }
};

interface ViewModeContextValue {
  config: ViewModeConfig;
  mode: ViewMode;
  isEmbedded: boolean;
  libavoidOptions?: LibavoidOptions; // Runtime override for libavoid options
}

const ViewModeContext = createContext<ViewModeContextValue | null>(null);

export function useViewMode(): ViewModeContextValue {
  const context = useContext(ViewModeContext);
  if (!context) {
    throw new Error('useViewMode must be used within a ViewModeProvider');
  }
  return context;
}

// --- Convenience helpers (keep all feature decisions centralized) --- //
type BooleanKeys<T> = { [K in keyof T]-?: T[K] extends boolean ? K : never }[keyof T];
export type FeatureKey = BooleanKeys<ViewModeConfig>;

export function useFeature(flag: FeatureKey): boolean {
  const { config } = useViewMode();
  return Boolean(config[flag]);
}

// Optional: tiny component gate to avoid inline ternaries everywhere
export function FeatureGate(
  { flag, children, fallback = null }:
  { flag: FeatureKey; children: React.ReactNode; fallback?: React.ReactNode }
) {
  return useFeature(flag) ? <>{children}</> : <>{fallback}</>;
}

interface ViewModeProviderProps {
  children: React.ReactNode;
  fallbackMode?: ViewMode;
}

export function ViewModeProvider({ children, fallbackMode = 'canvas' }: ViewModeProviderProps) {
  const config = useMemo(() => {
    // Simple path-based routing - no environment complexity
    const getViewMode = (): { mode: ViewMode; isEmbedded: boolean } => {
      if (typeof window === 'undefined') {
        return { mode: fallbackMode, isEmbedded: false };
      }
      
      // Optional: localStorage override for QA (centralized here)
      const override = localStorage.getItem('viewModeOverride') as ViewMode | null;
      if (override && ['embed', 'canvas', 'auth'].includes(override)) {
        return { mode: override, isEmbedded: false };
      }
      
      const path = window.location.pathname;
      
      // Simple path-based mode detection
      if (path === '/embed') {
        const isEmbedded = window.parent !== window;
        return { mode: 'embed', isEmbedded };
      } else if (path === '/canvas') {
        return { mode: 'canvas', isEmbedded: false };
      } else if (path === '/auth') {
        return { mode: 'auth', isEmbedded: false };
      }
      
      // Default: root path (/) - determine mode based on auth state
      // Check if user is authenticated (Firebase auth)
      try {
        const { auth } = require('../lib/firebase');
        if (auth && auth.currentUser) {
          // User is authenticated - use auth mode
          return { mode: 'auth', isEmbedded: false };
        }
      } catch (error) {
        // Firebase not available or error - fall back to canvas
      }
      
      // Not authenticated - use canvas for root path
      return { mode: 'canvas', isEmbedded: false };
    };
    
    const { mode, isEmbedded } = getViewMode();
    const baseConfig = VIEW_MODE_CONFIGS[mode];
    
    const fullConfig: ViewModeConfig = {
      mode,
      isEmbedded,
      ...baseConfig
    };
    
    return fullConfig;
  }, [fallbackMode]);
  
  const contextValue: ViewModeContextValue = {
    config,
    mode: config.mode,
    isEmbedded: config.isEmbedded
  };
  
  return (
    <ViewModeContext.Provider value={contextValue}>
      {children}
    </ViewModeContext.Provider>
  );
}
