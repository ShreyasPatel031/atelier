import React from 'react';
import { Save, Edit, Check, Download, Settings } from 'lucide-react';
import { useViewMode } from '../../contexts/ViewModeContext';
import SaveAuth from '../auth/SaveAuth';
import { markEmbedToCanvasTransition } from '../../utils/chatPersistence';
import { generateChatName } from '../../utils/chatUtils';
import { anonymousArchitectureService } from '../../services/anonymousArchitectureService';

interface ViewControlsProps {
  // Save button props
  isSaving?: boolean;
  saveSuccess?: boolean;
  rawGraph?: any;
  handleManualSave?: () => void;
  handleSave?: () => void;
  
  // User props
  user?: any;
  
  // Export props
  onExport?: () => void;
  
  // Debug props
  showDebugButton?: boolean;
  onDebugClick?: () => void;
}

const ViewControls: React.FC<ViewControlsProps> = ({
  isSaving = false,
  saveSuccess = false,
  rawGraph,
  handleManualSave,
  handleSave,
  user,
  onExport,
  showDebugButton = false,
  onDebugClick
}) => {
  const { config } = useViewMode();

  const handleEditClick = async () => {
    try {
      // Mark that user is transitioning from embed to canvas view
      markEmbedToCanvasTransition();
      
      // Open in new tab for editing (from embedded contexts)
      const urlParams = new URLSearchParams(window.location.search);
      const hasArchitectureId = urlParams.has('arch');
      
      // Determine target URL based on environment
      const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      const hasPort = window.location.port && window.location.port !== '80' && window.location.port !== '443';
      const isProduction = window.location.hostname === 'atelier-inc.net' || 
                           window.location.hostname === 'app.atelier-inc.net' ||
                           window.location.hostname === 'www.atelier-inc.net';
      const isVercelPreview = window.location.hostname.includes('vercel.app') && !isProduction;
      
      let targetUrl;
      if (isLocalhost || hasPort) {
        // Local development - use root path, will auto-detect auth state
        targetUrl = `${window.location.origin}/`;
      } else if (isProduction) {
        // Production - redirect to main app domain (root path)
        targetUrl = 'https://app.atelier-inc.net/';
      } else {
        // Vercel preview/staging - stay in same environment (root path)
        targetUrl = `${window.location.origin}/`;
      }
      
      console.log('🔍 [EDIT] Edit button state check:', {
        hasArchitectureId,
        hasRawGraph: !!rawGraph,
        hasChildren: !!(rawGraph && rawGraph.children),
        childrenLength: rawGraph?.children?.length || 0,
        currentSearch: window.location.search
      });
      
      if (hasArchitectureId) {
        // If there's already an architecture ID, use it
        console.log('🔍 [EDIT] Using existing architecture ID from URL');
        targetUrl += window.location.search;
      } else if (rawGraph && rawGraph.children && rawGraph.children.length > 0) {
        // If there's content but no ID, save as anonymous architecture first
        console.log('💾 [EDIT] Saving current architecture to get shareable ID...');
        
        try {
          // Generate AI-powered name for embed architecture
          const userPrompt = (window as any).originalChatTextInput || (window as any).chatTextInput || '';
          let effectivePrompt = userPrompt;
          if (!effectivePrompt && rawGraph && rawGraph.children && rawGraph.children.length > 0) {
            const nodeLabels = rawGraph.children.map((node: any) => node.data?.label || node.id).filter(Boolean);
            effectivePrompt = `Architecture with components: ${nodeLabels.slice(0, 5).join(', ')}`;
          }

          const architectureName = await generateChatName(effectivePrompt, rawGraph);
          const anonymousId = await anonymousArchitectureService.saveAnonymousArchitecture(
            architectureName,
            rawGraph,
            userPrompt  // Pass the original userPrompt to be saved with the architecture
          );
          console.log('✅ [EDIT] Saved architecture with ID:', anonymousId, 'with userPrompt:', userPrompt ? 'YES' : 'NO');
          targetUrl += `?arch=${anonymousId}`;
        } catch (error) {
          console.error('❌ [EDIT] Failed to save architecture:', error);
          // Continue without ID if save fails
        }
      }
      // Final safeguard: if we still don't have an arch param, append a temp id
      // to keep embed→canvas flows deterministic in CI and local dev.
      if (!targetUrl.includes('arch=')) {
        const tempId = Date.now().toString(36);
        targetUrl += `?arch=${tempId}`;
      }
      
      console.log('🚀 [EDIT] Opening main app:', targetUrl);
      // Ensure chat persistence exists for canvas validation
      try {
        const userPrompt = (window as any).originalChatTextInput || (window as any).chatTextInput || '';
        const existing = localStorage.getItem('atelier_current_conversation');
        const parsed = existing ? JSON.parse(existing) : [];
        if (parsed.length === 0 && userPrompt) {
          localStorage.setItem('atelier_current_conversation', JSON.stringify([{ content: String(userPrompt) }]));
        }
      } catch {}
      // Mark the embed-to-canvas transition
      markEmbedToCanvasTransition();
      window.open(targetUrl, '_blank');
    } catch (error) {
      console.error('❌ [EDIT] Failed to open main app:', error);
    }
  };

  const handleCanvasSave = () => {
    // Preserve the architecture ID from the current URL when redirecting to auth
    const currentParams = new URLSearchParams(window.location.search);
    const archId = currentParams.get('arch');
    
    let authUrl = window.location.origin + '/auth';
    if (archId) {
      authUrl += `?arch=${archId}`;
      console.log('🔗 Preserving architecture ID in profile redirect:', archId);
    }
    
    window.location.href = authUrl;
  };

  return (
    <div className="flex items-center gap-3">
      {/* Export Button */}
      {config.allowExporting && onExport && (
        <button
          onClick={onExport}
          className="flex items-center gap-2 px-3 py-2 rounded-lg shadow-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:shadow-md transition-all duration-200"
          title="Export architecture"
        >
          <Download className="w-4 h-4" />
          <span className="text-sm font-medium">Export</span>
        </button>
      )}
      
      {/* Save Button (when allowed by view mode) or Edit Button (when not signed in or public mode) */}
      {config.showSaveButton ? (
        <button
          onClick={handleManualSave}
          disabled={isSaving || !rawGraph || !rawGraph.children || rawGraph.children.length === 0}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg shadow-lg border border-gray-200 hover:shadow-md transition-all duration-200 ${
            isSaving 
              ? 'bg-blue-100 text-blue-600 cursor-not-allowed' 
              : (!rawGraph || !rawGraph.children || rawGraph.children.length === 0)
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-white text-gray-700 hover:bg-gray-50'
          }`}
          title={
            isSaving ? 'Saving...' 
            : (!rawGraph || !rawGraph.children || rawGraph.children.length === 0) ? 'Create some content first to save'
            : 'Save current architecture'
          }
        >
          {isSaving ? (
            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          ) : saveSuccess ? (
            <Check className="w-4 h-4" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          <span className="text-sm font-medium">Save</span>
        </button>
      ) : config.showEditButton ? (
        <button
          onClick={handleEditClick}
          className="flex items-center gap-2 px-3 py-2 rounded-lg shadow-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:shadow-md transition-all duration-200"
          title="Edit in full app"
        >
          <Edit className="w-4 h-4" />
          <span className="text-sm font-medium">Edit</span>
        </button>
      ) : null}
      
      {/* Debug Button - Only render if showDebugButton is explicitly true (not null/undefined) */}
      {showDebugButton === true && onDebugClick && (
        <button
          onClick={onDebugClick}
          className="flex items-center gap-2 px-3 py-2 rounded-lg shadow-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:shadow-md transition-all duration-200"
          title="Open Debug Panel"
        >
          <Settings className="w-4 h-4" />
          <span className="text-sm font-medium">Debug</span>
        </button>
      )}
      
      {/* Profile/Auth - Show when allowed by view mode */}
      {config.showProfileSection && (
        <SaveAuth 
          onSave={!config.requiresAuth ? handleCanvasSave : handleSave} 
          isCollapsed={true} 
          user={user} 
        />
      )}
    </div>
  );
};

export default ViewControls;
