import { useState, useCallback } from 'react';
import { RawGraph } from '../components/graph/types/index';
import { generateChatName } from '../utils/chatUtils';
import { anonymousArchitectureService } from '../services/anonymousArchitectureService';
import { ArchitectureService } from '../services/architectureService';

export interface ArchitectureTab {
  id: string;
  name: string;
  timestamp: Date;
  rawGraph?: RawGraph | null;
  firebaseId?: string;
  userPrompt?: string;
  isFromFirebase?: boolean;
  isNew?: boolean;
  isShared?: boolean;
}

export function useArchitectureState() {
  // Architecture state
  const [savedArchitectures, setSavedArchitectures] = useState<ArchitectureTab[]>(() => {
    // Start with "New Architecture" as first tab
    const newArchTab = {
      id: 'new-architecture',
      name: 'New Architecture',
      timestamp: new Date(),
      rawGraph: { id: "root", children: [], edges: [] },
      isNew: true
    };
    // Only show the "New Architecture" tab initially - no mock architectures
    return [newArchTab];
  });

  const [selectedArchitectureId, setSelectedArchitectureId] = useState<string>('new-architecture');
  const [currentChatName, setCurrentChatName] = useState<string>('New Architecture');

  return {
    savedArchitectures,
    setSavedArchitectures,
    selectedArchitectureId,
    setSelectedArchitectureId,
    currentChatName,
    setCurrentChatName,
  };
}
