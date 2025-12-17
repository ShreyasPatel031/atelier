import { startNewConversation } from '../utils/chatPersistence';

export class CanvasArchitectureService {
  private params: any;
  
  constructor(params: any) {
    this.params = params;
  }
  
  handleNewArchitecture = () => {
    const {
      setSavedArchitectures,
      setSelectedArchitectureId,
      setCurrentChatName,
      setRawGraph,
      viewStateRef
    } = this.params;
    
    console.log('🆕 Creating new architecture');
    
    // Ensure "New Architecture" tab exists
    setSavedArchitectures(prev => {
      const hasNewArch = prev.some(arch => arch.id === 'new-architecture');
      if (!hasNewArch) {
        const newArchTab = {
          id: 'new-architecture',
          name: 'New Architecture',
          timestamp: new Date(),
          rawGraph: { id: "root", children: [], edges: [] },
          isNew: true
        };
        // Add "New Architecture" as first tab
        return [newArchTab, ...prev];
      }
      return prev;
    });
    
    // Select the "New Architecture" tab
    setSelectedArchitectureId('new-architecture');
    setCurrentChatName('New Architecture');
    
    // Reset canvas to empty graph
    const emptyGraph = { id: "root", children: [], edges: [] };
    setRawGraph(emptyGraph);
    
    // Reset view state
    if (viewStateRef?.current) {
      viewStateRef.current = { node: {}, group: {}, edge: {}, layout: {} };
    }
    
    // Clear conversation
    startNewConversation();
    
    // Dispatch custom event to notify chat component to refresh
    // Storage events only fire for cross-window changes, so we need a custom event
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('chatCleared'));
      console.log('💬 Dispatched chatCleared event');
    }
    
    console.log('💬 Cleared conversation for new architecture');
    
    // Clear global chat input
    (window as any).originalChatTextInput = '';
    (window as any).chatTextInput = '';
    (window as any).currentGraph = emptyGraph;
    
    console.log('✅ New architecture created and selected');
  };
  
  handleDeleteArchitecture = () => {};
  handleShareArchitecture = () => {};
  handleEditArchitecture = () => {};
}



