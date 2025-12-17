import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';

export interface ElkSpacingOptions {
  spacingEdgeNode: number;
  spacingNodeNode: number;
  spacingEdgeEdge: number;
  spacingEdgeEdgeBetweenLayers: number;
  spacingNodeNodeBetweenLayers: number;
  spacingEdgeNodeBetweenLayers: number;
  // Additional spacing parameters for vertical edge control
  spacingPortPort: number;
  spacingComponentComponent: number;
  spacingLabelLabel: number;
  spacingLabelNode: number;
  spacingEdgeLabel: number;
}

interface ElkDebugContextType {
  options: ElkSpacingOptions;
  updateOptions: (options: Partial<ElkSpacingOptions>) => void;
  resetOptions: () => void;
  triggerLayout: () => void;
}

const DEFAULT_OPTIONS: ElkSpacingOptions = {
  spacingEdgeNode: 1,
  spacingNodeNode: 1,
  spacingEdgeEdge: 1,
  spacingEdgeEdgeBetweenLayers: 1,
  spacingNodeNodeBetweenLayers: 1,
  spacingEdgeNodeBetweenLayers: 1,
  // Additional defaults
  spacingPortPort: 1,
  spacingComponentComponent: 1,
  spacingLabelLabel: 1,
  spacingLabelNode: 1,
  spacingEdgeLabel: 0,
};

const ElkDebugContext = createContext<ElkDebugContextType | undefined>(undefined);

export const ElkDebugProvider: React.FC<{ children: ReactNode; onTriggerLayout: () => void }> = ({ 
  children, 
  onTriggerLayout 
}) => {
  const [options, setOptions] = useState<ElkSpacingOptions>(DEFAULT_OPTIONS);

  const updateOptions = useCallback((newOptions: Partial<ElkSpacingOptions>) => {
    setOptions(prev => ({ ...prev, ...newOptions }));
  }, []);

  const resetOptions = useCallback(() => {
    setOptions(DEFAULT_OPTIONS);
  }, []);

  const triggerLayout = useCallback(() => {
    onTriggerLayout();
  }, [onTriggerLayout]);

  return (
    <ElkDebugContext.Provider value={{ options, updateOptions, resetOptions, triggerLayout }}>
      {children}
    </ElkDebugContext.Provider>
  );
};

export const useElkDebug = () => {
  const context = useContext(ElkDebugContext);
  if (!context) {
    return { 
      options: DEFAULT_OPTIONS, 
      updateOptions: () => {}, 
      resetOptions: () => {},
      triggerLayout: () => {}
    };
  }
  return context;
};

