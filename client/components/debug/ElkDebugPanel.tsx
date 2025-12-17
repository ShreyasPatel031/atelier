"use client";

import React, { useCallback, useEffect } from 'react';
import { X, RotateCcw } from 'lucide-react';
import { useElkDebug, type ElkSpacingOptions } from '../../contexts/ElkDebugContext';
import { setElkSpacingGetter } from '../graph/utils/elk/elkOptions';

interface ElkDebugPanelProps {
  isVisible: boolean;
  onClose: () => void;
}

const ElkDebugPanel: React.FC<ElkDebugPanelProps> = ({
  isVisible,
  onClose,
}) => {
  const { options, updateOptions, resetOptions, triggerLayout } = useElkDebug();

  // Wire up options to elkOptions.ts so ensureIds can access them
  useEffect(() => {
    setElkSpacingGetter(() => options);
  }, [options]);

  const handleSliderChange = useCallback((key: keyof ElkSpacingOptions, value: number) => {
    updateOptions({ [key]: value });
    // Auto-trigger layout recalculation when slider changes
    // Use a small delay to debounce rapid changes
    setTimeout(() => {
      triggerLayout();
    }, 300);
  }, [updateOptions, triggerLayout]);

  const handleReset = useCallback(() => {
    resetOptions();
  }, [resetOptions]);

  const handleTriggerLayout = useCallback(() => {
    triggerLayout();
  }, [triggerLayout]);

  if (!isVisible) return null;

  return (
    <div className="fixed top-0 right-0 h-full w-80 bg-white border-l border-gray-300 shadow-xl z-[10002] overflow-y-auto">
      <div className="sticky top-0 bg-white border-b border-gray-300 p-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">ELK Spacing Debug</h2>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-100 rounded"
          title="Close Debug Panel"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="p-4 space-y-6">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={handleReset}
            className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Reset to Defaults
          </button>
          <button
            onClick={handleTriggerLayout}
            className="px-3 py-1.5 text-sm bg-blue-500 hover:bg-blue-600 text-white rounded"
          >
            Recalculate Layout
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Edge-Node Spacing: {options.spacingEdgeNode} units ({options.spacingEdgeNode * 16}px)
            </label>
            <input
              type="range"
              min="0"
              max="10"
              step="1"
              value={options.spacingEdgeNode}
              onChange={(e) => handleSliderChange('spacingEdgeNode', parseInt(e.target.value))}
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Node-Node Spacing: {options.spacingNodeNode} units ({options.spacingNodeNode * 16}px)
            </label>
            <input
              type="range"
              min="0"
              max="10"
              step="1"
              value={options.spacingNodeNode}
              onChange={(e) => handleSliderChange('spacingNodeNode', parseInt(e.target.value))}
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Edge-Edge Spacing: {options.spacingEdgeEdge} units ({options.spacingEdgeEdge * 16}px)
            </label>
            <input
              type="range"
              min="0"
              max="10"
              step="1"
              value={options.spacingEdgeEdge}
              onChange={(e) => handleSliderChange('spacingEdgeEdge', parseInt(e.target.value))}
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Edge-Edge Between Layers: {options.spacingEdgeEdgeBetweenLayers} units ({options.spacingEdgeEdgeBetweenLayers * 16}px)
            </label>
            <input
              type="range"
              min="0"
              max="10"
              step="1"
              value={options.spacingEdgeEdgeBetweenLayers}
              onChange={(e) => handleSliderChange('spacingEdgeEdgeBetweenLayers', parseInt(e.target.value))}
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Node-Node Between Layers: {options.spacingNodeNodeBetweenLayers} units ({options.spacingNodeNodeBetweenLayers * 16}px)
            </label>
            <input
              type="range"
              min="0"
              max="10"
              step="1"
              value={options.spacingNodeNodeBetweenLayers}
              onChange={(e) => handleSliderChange('spacingNodeNodeBetweenLayers', parseInt(e.target.value))}
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Edge-Node Between Layers: {options.spacingEdgeNodeBetweenLayers} units ({options.spacingEdgeNodeBetweenLayers * 16}px)
            </label>
            <input
              type="range"
              min="0"
              max="10"
              step="1"
              value={options.spacingEdgeNodeBetweenLayers}
              onChange={(e) => handleSliderChange('spacingEdgeNodeBetweenLayers', parseInt(e.target.value))}
              className="w-full"
            />
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-500">
            All spacing values are in ELK units. Each unit = 16px (GRID_SIZE).
            Changes will trigger ELK layout recalculation.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ElkDebugPanel;

