import React, { useState } from 'react';
import { Settings, X } from 'lucide-react';
import { useNodeStyle } from '../../contexts/NodeStyleContext';

const NodeStyleSettings: React.FC = () => {
  const { settings, updateSettings } = useNodeStyle();
  const [isOpen, setIsOpen] = useState(false);

  const handleIconSizeChange = (size: number) => {
    updateSettings({ iconSize: size });
  };

  const handleNodePaddingVerticalChange = (padding: number) => {
    updateSettings({ nodePaddingVertical: padding });
  };

  const handleNodePaddingHorizontalChange = (padding: number) => {
    updateSettings({ nodePaddingHorizontal: padding });
  };

  const handleTextPaddingChange = (padding: number) => {
    updateSettings({ textPadding: padding });
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 z-[100] p-3 bg-white rounded-lg shadow-lg border border-gray-200 hover:bg-gray-50 transition-all"
        title="Node Style Settings"
      >
        <Settings className="w-5 h-5 text-gray-700" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-[100] bg-white rounded-lg shadow-lg border border-gray-200 p-4 min-w-[280px]">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-700">Node Style Settings</h3>
        <button
          onClick={() => setIsOpen(false)}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-4">
        {/* Icon Size Slider */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-2">
            Icon Size: {settings.iconSize}px
          </label>
          <input
            type="range"
            min="16"
            max="96"
            value={settings.iconSize}
            onChange={(e) => handleIconSizeChange(Number(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
        </div>

        {/* Node Padding Vertical (Top/Bottom) Slider */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-2">
            Node Padding (Top/Bottom): {settings.nodePaddingVertical}px
          </label>
          <input
            type="range"
            min="0"
            max="32"
            value={settings.nodePaddingVertical}
            onChange={(e) => handleNodePaddingVerticalChange(Number(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
        </div>

        {/* Node Padding Horizontal (Left/Right) Slider */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-2">
            Node Padding (Left/Right): {settings.nodePaddingHorizontal}px
          </label>
          <input
            type="range"
            min="0"
            max="32"
            value={settings.nodePaddingHorizontal}
            onChange={(e) => handleNodePaddingHorizontalChange(Number(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
        </div>

        {/* Text/Icon Padding Slider */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-2">
            Text Padding: {settings.textPadding}px
          </label>
          <input
            type="range"
            min="0"
            max="32"
            value={settings.textPadding}
            onChange={(e) => handleTextPaddingChange(Number(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
        </div>
      </div>
    </div>
  );
};

export default NodeStyleSettings;

