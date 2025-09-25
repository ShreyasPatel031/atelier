import React, { createContext, useContext, useMemo } from 'react';

// Simplified view mode - just use path-based routing, no complex environment logic
export type ViewMode = 'embed' | 'canvas' | 'auth';

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
  }
};

interface ViewModeContextValue {
  config: ViewModeConfig;
  mode: ViewMode;
  isEmbedded: boolean;
}

const ViewModeContext = createContext<ViewModeContextValue | null>(null);

export function useViewMode(): ViewModeContextValue {
  const context = useContext(ViewModeContext);
  if (!context) {
    throw new Error('useViewMode must be used within a ViewModeProvider');
  }
  return context;
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
      
      // Default to canvas for root and any other path
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
