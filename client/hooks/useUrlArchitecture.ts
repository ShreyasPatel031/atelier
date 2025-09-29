/**
 * Centralized URL architecture processing hook
 * Replaces scattered URL architecture checking and loading logic
 */

import { useCallback } from 'react';
import { anonymousArchitectureService, AnonymousArchitecture } from '../services/anonymousArchitectureService';

interface UseUrlArchitectureProps {
  loadArchitecture: (architecture: AnonymousArchitecture, source: string) => void;
  config: { isEmbedded: boolean; requiresAuth?: boolean };
}

export function useUrlArchitecture({ loadArchitecture, config }: UseUrlArchitectureProps) {
  /**
   * Check for URL architecture ID and load it if present
   * Returns whether URL architecture was found and loaded
   */
  const checkAndLoadUrlArchitecture = useCallback(async (): Promise<boolean> => {
    // Short circuit for embedded mode
    if (config.isEmbedded) {
      return false;
    }

    const urlArchId = anonymousArchitectureService.getArchitectureIdFromUrl();
    console.log('🔍 [URL-ARCH] Checking for URL architecture ID:', urlArchId);
    
    if (urlArchId) {
      console.log('🔄 [URL-ARCH] Loading shared architecture from URL');
      await loadSharedAnonymousArchitecture(urlArchId);
      return true;
    }
    
    return false;
  }, [loadArchitecture, config.isEmbedded]);

  /**
   * Load a shared anonymous architecture by ID
   */
  const loadSharedAnonymousArchitecture = useCallback(async (architectureId: string) => {
    console.log('🔥 [LOAD-SHARED] Starting to load shared architecture:', architectureId);
    
    try {
      const sharedArch = await anonymousArchitectureService.loadAnonymousArchitectureById(architectureId);
      
      if (sharedArch && sharedArch.rawGraph) {
        console.log('🔥 [LOAD-SHARED] ✅ Loaded shared architecture:', {
          id: architectureId,
          name: sharedArch.name,
          nodeCount: sharedArch.rawGraph?.children?.length || 0
        });
        
        // Check if we're in auth mode (user is authenticated)
        const isAuthMode = config.requiresAuth || false;
        console.log('🔥 [LOAD-SHARED] Auth mode:', isAuthMode);
        
        if (isAuthMode) {
          // In auth mode, we need to convert the anonymous architecture to a Firebase architecture
          // and set it as priority so it becomes the first tab
          console.log('🔥 [LOAD-SHARED] 🔐 Processing URL architecture for authenticated user');
          
          try {
            // Import required modules
            const { ArchitectureService } = await import('../services/architectureService');
            const { generateNameWithFallback } = await import('../utils/naming');
            const { getChatMessages } = await import('../utils/chatPersistence');
            
            // Get chat messages for naming
            const persistedMessages = getChatMessages();
            const lastUserMessage = persistedMessages.filter(msg => msg.sender === 'user').pop();
            const userPrompt = lastUserMessage?.content || (window as any).originalChatTextInput || (window as any).chatTextInput || '';
            
            console.log('🔥 [LOAD-SHARED] 📝 Chat messages for naming:', persistedMessages);
            console.log('🔥 [LOAD-SHARED] 🏷️ User prompt for naming:', userPrompt);
            
            // Generate name using backend API
            const baseChatName = await generateNameWithFallback(sharedArch.rawGraph, userPrompt);
            console.log('🔥 [LOAD-SHARED] 🎯 Generated architecture name:', baseChatName);
            
            // Save to Firebase
            const savedArchId = await ArchitectureService.saveArchitecture({
              name: baseChatName,
              userId: ArchitectureService.getCurrentUserId() || '',
              userEmail: ArchitectureService.getCurrentUserEmail() || '',
              rawGraph: sharedArch.rawGraph,
              userPrompt: userPrompt,
              nodes: [],
              edges: []
            });
            
            console.log('🔥 [LOAD-SHARED] 💾 Saved to Firebase with ID:', savedArchId);
            
            // Set as priority architecture so it appears as first tab
            localStorage.setItem('priority_architecture_id', savedArchId);
            console.log('🔥 [LOAD-SHARED] 🏆 Set priority architecture ID:', savedArchId);
            
            // Create the architecture object for loading
            const firebaseArch = {
              id: savedArchId,
              name: baseChatName,
              timestamp: new Date(),
              rawGraph: sharedArch.rawGraph,
              firebaseId: savedArchId,
              userPrompt: userPrompt,
              isFromFirebase: true
            };
            
            // Load the architecture
            loadArchitecture(firebaseArch, 'URL_AUTH_TRANSFER');
            
          } catch (error) {
            console.error('🔥 [LOAD-SHARED] ❌ Failed to process for authenticated user:', error);
            // Fallback to anonymous loading
            loadArchitecture(sharedArch, 'URL_SHARED');
          }
        } else {
          // In canvas/embed mode, load directly as anonymous architecture
          console.log('🔥 [LOAD-SHARED] 🌐 Loading as anonymous architecture (non-auth mode)');
          loadArchitecture(sharedArch, 'URL_SHARED');
        }
        
      } else {
        console.warn('🔥 [LOAD-SHARED] ⚠️ Shared architecture not found or has no content:', architectureId);
      }
    } catch (error) {
      console.error('🔥 [LOAD-SHARED] ❌ Failed to load shared architecture:', error);
    }
  }, [loadArchitecture, config]);

  return {
    checkAndLoadUrlArchitecture,
    loadSharedAnonymousArchitecture
  };
}
