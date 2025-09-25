import React, { createContext, useContext, useMemo } from 'react';

// Define the three core view modes and their capabilities
export type ViewMode = 'framer' | 'canvas' | 'auth';

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
  showAgentIcon: boolean; // Controls the agent icon in RightPanelChat, not the Atelier ProcessingStatusIcon
  showChatbox: boolean; // Controls the bottom chatbox - only needed in embed view
}

const VIEW_MODE_CONFIGS: Record<ViewMode, Omit<ViewModeConfig, 'mode' | 'isEmbedded'>> = {
  framer: {
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
    showChatPanel: false, // Hide chat panel in embed view
    showAgentIcon: false, // Hide agent icon in embed view
    showChatbox: true, // Show chatbox in embed view (only way to chat)
  },
  canvas: {
    requiresAuth: false,
    showSaveButton: true, // Keep save button so users can sign in and get redirected to auth
    showEditButton: false,
    showProfileSection: true, // Keep profile section so users can sign in and get redirected to auth
    showSidebar: true,
    allowSharing: true,
    allowExporting: true,
    allowArchitectureManagement: false,
    showDevPanel: false,
    showSettings: false,
        showChatPanel: true, // Show chat panel in canvas view
    showAgentIcon: true, // Show agent icon in canvas view
    showChatbox: false, // Hide chatbox in canvas view (use right chat panel instead)
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
    showChatPanel: true, // Show chat panel in auth view
    showAgentIcon: true, // Show agent icon in auth view
    showChatbox: false, // Hide chatbox in auth view (use right chat panel instead)
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

export function ViewModeProvider({ children, fallbackMode = 'auth' }: ViewModeProviderProps) {
  const config = useMemo(() => {
    // Determine mode based on environment and context
    const getViewMode = (): { mode: ViewMode; isEmbedded: boolean } => {
      if (typeof window === 'undefined') {
        return { mode: fallbackMode, isEmbedded: false };
      }
      
      const path = window.location.pathname;
      const isProduction = process.env.NODE_ENV === 'production';
      const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      const hasPort = window.location.port && window.location.port !== '80' && window.location.port !== '443';
      const isDevelopment = isLocalhost || hasPort;
      
      // Environment check completed
      
      // Path-based mode detection (primary)
      if (path === '/embed') {
        console.log('🌐 Embed mode: staying in embed (redirect only happens via Edit button)');
        const isEmbedded = window.parent !== window;
        return { mode: 'framer', isEmbedded };
      } else if (path === '/canvas') {
        return { mode: 'canvas', isEmbedded: false };
      } else if (path === '/auth') {
        return { mode: 'auth', isEmbedded: false };
      }
      
      
      // Default fallback
      return { mode: fallbackMode, isEmbedded: false };
    };
    
    const { mode, isEmbedded } = getViewMode();
    const baseConfig = VIEW_MODE_CONFIGS[mode];
    
    const fullConfig: ViewModeConfig = {
      mode,
      isEmbedded,
      ...baseConfig
    };
    
    // Removed logging spam
    
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
