import { createContext, useContext } from 'react';

export interface NodeInteractionContextValue {
  selectedTool: string;
  connectingFrom: string | null;
  connectingFromHandle: string | null;
  handleConnectorDotClick: (nodeId: string, handleId: string) => void;
  handleLabelChange: (id: string, label: string) => void;
  handleAddNodeToGroup: (groupId: string) => void;
  handleArrangeGroup?: (groupId: string) => void;
  selectedNodeIds: string[];
}

export const NodeInteractionContext = createContext<NodeInteractionContextValue | null>(null);

export const useNodeInteractions = (): NodeInteractionContextValue | null => {
  return useContext(NodeInteractionContext);
};

