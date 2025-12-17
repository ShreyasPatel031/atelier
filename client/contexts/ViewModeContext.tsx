import React, { createContext, useContext, useMemo, useState, useEffect } from 'react';

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
      shapeBufferDistance: 32, // 2 grid spaces (16px * 2 = 32px)
      portEdgeSpacing: 16,
      routingType: 'orthogonal',
      hateCrossings: true,
      nudgeOrthSegments: false,
      nudgeSharedPaths: false,
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
      shapeBufferDistance: 32, // 2 grid spaces (16px * 2 = 32px)
      portEdgeSpacing: 16,
      routingType: 'orthogonal',
      hateCrossings: true,
      nudgeOrthSegments: false,
      nudgeSharedPaths: false,
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
      shapeBufferDistance: 32, // 2 grid spaces (16px * 2 = 32px)
      portEdgeSpacing: 16,
      routingType: 'orthogonal',
      hateCrossings: true,
      nudgeOrthSegments: false,
      nudgeSharedPaths: false,
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
  // Track pathname changes to update view mode when user navigates between routes
  const [pathname, setPathname] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.location.pathname;
    }
    return '/';
  });

  // Listen for pathname changes (navigation events)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const updatePathname = () => {
      setPathname(window.location.pathname);
    };

    // Update on initial load
    updatePathname();

    // Listen for popstate (back/forward navigation)
    window.addEventListener('popstate', updatePathname);

    // Listen for pushstate/replacestate (programmatic navigation)
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = function(...args) {
      originalPushState.apply(history, args);
      updatePathname();
    };

    history.replaceState = function(...args) {
      originalReplaceState.apply(history, args);
      updatePathname();
    };

    // Also check periodically in case navigation happens outside of these events
    const interval = setInterval(updatePathname, 100);

    return () => {
      window.removeEventListener('popstate', updatePathname);
      history.pushState = originalPushState;
      history.replaceState = originalReplaceState;
      clearInterval(interval);
    };
  }, []);

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
      
      // Use tracked pathname state
      const path = pathname;
      
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
  }, [fallbackMode, pathname]);
  
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
