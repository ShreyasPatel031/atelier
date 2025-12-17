import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';

export interface VisualOptions {
  groupColor: string;
  groupOpacity: number;
  groupStrokeColor: string;
  nodeColor: string;
  nodeOpacity: number;
  nodeStrokeColor: string;
  edgeColor: string;
  edgeOpacity: number;
  edgeType: 'step' | 'smoothstep' | 'straight' | 'bezier';
  edgeMarkerType: 'arrow' | 'arrowclosed' | 'none';
}

interface VisualDebugContextType {
  options: VisualOptions;
  updateOptions: (options: Partial<VisualOptions>) => void;
  resetOptions: () => void;
}

const DEFAULT_OPTIONS: VisualOptions = {
  groupColor: '#F5F5F5',
  groupOpacity: 0.5,
  groupStrokeColor: '#adb5bd',
  nodeColor: '#ffffff',
  nodeOpacity: 1.0,
  nodeStrokeColor: '#e4e4e4',
  edgeColor: '#D4D4DB',
  edgeOpacity: 1.0,
  edgeType: 'step',
  edgeMarkerType: 'arrowclosed',
};

const VisualDebugContext = createContext<VisualDebugContextType | undefined>(undefined);

export const VisualDebugProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [options, setOptions] = useState<VisualOptions>(DEFAULT_OPTIONS);

  const updateOptions = useCallback((newOptions: Partial<VisualOptions>) => {
    setOptions(prev => ({ ...prev, ...newOptions }));
  }, []);

  const resetOptions = useCallback(() => {
    setOptions(DEFAULT_OPTIONS);
  }, []);

  return (
    <VisualDebugContext.Provider value={{ options, updateOptions, resetOptions }}>
      {children}
    </VisualDebugContext.Provider>
  );
};

export const useVisualDebug = () => {
  const context = useContext(VisualDebugContext);
  if (!context) {
    return { 
      options: DEFAULT_OPTIONS, 
      updateOptions: () => {}, 
      resetOptions: () => {}
    };
  }
  return context;
};



