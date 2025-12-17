import React, { createContext, useContext, useState, ReactNode } from 'react';
import { DEFAULT_NODE_STYLE_SETTINGS, type NodeStyleSettings } from '../utils/nodeConstants';

interface NodeStyleContextType {
  settings: NodeStyleSettings;
  updateSettings: (settings: Partial<NodeStyleSettings>) => void;
}

const NodeStyleContext = createContext<NodeStyleContextType | undefined>(undefined);

export const NodeStyleProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<NodeStyleSettings>(DEFAULT_NODE_STYLE_SETTINGS);

  const updateSettings = (newSettings: Partial<NodeStyleSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  };

  return (
    <NodeStyleContext.Provider value={{ settings, updateSettings }}>
      {children}
    </NodeStyleContext.Provider>
  );
};

export const useNodeStyle = () => {
  const context = useContext(NodeStyleContext);
  if (!context) {
    return { settings: DEFAULT_NODE_STYLE_SETTINGS, updateSettings: () => {} };
  }
  return context;
};

