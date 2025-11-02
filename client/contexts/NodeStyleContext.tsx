import React, { createContext, useContext, useState, ReactNode } from 'react';

interface NodeStyleSettings {
  iconSize: number;
  nodePaddingVertical: number; // top and bottom
  nodePaddingHorizontal: number; // left and right
  textPadding: number;
}

interface NodeStyleContextType {
  settings: NodeStyleSettings;
  updateSettings: (settings: Partial<NodeStyleSettings>) => void;
}

const defaultSettings: NodeStyleSettings = {
  iconSize: 48,
  nodePaddingVertical: 16,
  nodePaddingHorizontal: 8,
  textPadding: 8,
};

const NodeStyleContext = createContext<NodeStyleContextType | undefined>(undefined);

export const NodeStyleProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<NodeStyleSettings>(defaultSettings);

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
    return { settings: defaultSettings, updateSettings: () => {} };
  }
  return context;
};

