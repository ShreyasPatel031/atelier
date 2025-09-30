import React from 'react';
import { Share, Download, Settings, Save, Check, PanelRightClose, PanelRightOpen } from 'lucide-react';
import { User as FirebaseUser } from 'firebase/auth';
import SaveAuth from '../auth/SaveAuth';

interface RightControlPanelProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  user: FirebaseUser | null;
  rawGraph: any;
  isSaving: boolean;
  saveSuccess: boolean;
  onShare: () => void;
  onExport: () => void;
  onManualSave: () => void;
  onSave: (user: FirebaseUser) => void;
}

const RightControlPanel: React.FC<RightControlPanelProps> = ({
  isCollapsed,
  onToggleCollapse,
  user,
  rawGraph,
  isSaving,
  saveSuccess,
  onShare,
  onExport,
  onManualSave,
  onSave
}) => {
  const hasContent = rawGraph && rawGraph.children && rawGraph.children.length > 0;

  return (
    <div className={`
      relative h-full bg-gray-50 text-gray-700 border-l border-gray-200 transition-all duration-300 ease-in-out
      ${isCollapsed ? 'w-18' : 'w-80'}
    `}>
      {/* Toggle Button - Top of panel */}
      <div className="absolute top-4 left-4 z-10">
        <button
          onClick={onToggleCollapse}
          className="w-10 h-10 flex items-center justify-center rounded-lg bg-white border border-gray-200 shadow-lg hover:bg-gray-50 transition-all"
          title={isCollapsed ? "Expand Controls" : "Collapse Controls"}
        >
          {isCollapsed ? (
            <PanelRightClose className="w-4 h-4 text-gray-700" />
          ) : (
            <PanelRightOpen className="w-4 h-4 text-gray-700" />
          )}
        </button>
      </div>

      {/* Controls Container */}
      <div className="flex flex-col h-full pt-20 px-4">
        <div className="flex flex-col gap-3">
          {/* Share Button */}
          {isCollapsed ? (
            <button
              onClick={onShare}
              disabled={!hasContent}
              className={`w-10 h-10 flex items-center justify-center rounded-lg shadow-lg border transition-all duration-200 ${
                !hasContent
                  ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                  : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
              }`}
              title={!hasContent ? 'Create some content first to share' : 'Share current architecture'}
            >
              <Share className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={onShare}
              disabled={!hasContent}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg shadow-lg border transition-all duration-200 ${
                !hasContent
                  ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                  : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
              }`}
              title={!hasContent ? 'Create some content first to share' : 'Share current architecture'}
            >
              <Share className="w-4 h-4" />
              <span className="text-sm font-medium">Share</span>
            </button>
          )}

          {/* Export Button */}
          {isCollapsed ? (
            <button
              onClick={onExport}
              disabled={!hasContent}
              className={`w-10 h-10 flex items-center justify-center rounded-lg shadow-lg border transition-all duration-200 ${
                !hasContent
                  ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                  : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
              }`}
              title={!hasContent ? 'Create some content first to export' : 'Export as PNG'}
            >
              <Download className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={onExport}
              disabled={!hasContent}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg shadow-lg border transition-all duration-200 ${
                !hasContent
                  ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                  : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
              }`}
              title={!hasContent ? 'Create some content first to export' : 'Export as PNG'}
            >
              <Download className="w-4 h-4" />
              <span className="text-sm font-medium">Export PNG</span>
            </button>
          )}

          {/* Save Button - Only for authenticated users */}
          {user && (
            isCollapsed ? (
              <button
                onClick={onManualSave}
                disabled={isSaving || !hasContent}
                className={`w-10 h-10 flex items-center justify-center rounded-lg shadow-lg border transition-all duration-200 ${
                  saveSuccess
                    ? 'bg-green-50 text-green-600 border-green-200'
                    : isSaving || !hasContent
                    ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                    : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                }`}
                title={!hasContent ? 'Create some content first to save' : 'Save architecture'}
              >
                {saveSuccess ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              </button>
            ) : (
              <button
                onClick={onManualSave}
                disabled={isSaving || !hasContent}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-lg shadow-lg border transition-all duration-200 ${
                  saveSuccess
                    ? 'bg-green-50 text-green-600 border-green-200'
                    : isSaving || !hasContent
                    ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                    : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                }`}
                title={!hasContent ? 'Create some content first to save' : 'Save architecture'}
              >
                {saveSuccess ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                <span className="text-sm font-medium">
                  {isSaving ? 'Saving...' : saveSuccess ? 'Saved!' : 'Save'}
                </span>
              </button>
            )
          )}

          {/* Sign In / Profile - Only show when not collapsed */}
          {!isCollapsed && (
            <div className="mt-4">
              <SaveAuth onSave={onSave} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ArchitectureSidebar;
