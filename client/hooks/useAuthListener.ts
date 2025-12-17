import { useEffect, useState } from 'react';
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "../lib/firebase";
import { ArchitectureService } from "../services/architectureService";
import { anonymousArchitectureService } from "../services/anonymousArchitectureService";
import { generateChatName } from "../utils/chatUtils";
import { isEmbedToCanvasTransition, clearEmbedToCanvasFlag, getChatMessages } from "../utils/chatPersistence";
import { RawGraph } from "../components/graph/types/index";
import { convertFirebaseArch } from "../services/syncArchitectures";

interface UseAuthListenerProps {
  config: {
    requiresAuth: boolean;
    mode: string;
  };
  setUser: (user: User | null) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setRawGraph: React.Dispatch<React.SetStateAction<RawGraph | null>>;
  setSavedArchitectures: React.Dispatch<React.SetStateAction<any[]>>;
  setSelectedArchitectureId: (id: string) => void;
  setCurrentChatName: (name: string) => void;
  setUrlArchitectureProcessed: (processed: boolean) => void;
  setHasInitialSync: (synced: boolean) => void;
  hasInitialSync: boolean;
  user: User | null;
}

export function useAuthListener({
  config,
  setUser,
  setSidebarCollapsed,
  setRawGraph,
  setSavedArchitectures,
  setSelectedArchitectureId,
  setCurrentChatName,
  setUrlArchitectureProcessed,
  setHasInitialSync,
  hasInitialSync,
  user
}: UseAuthListenerProps) {
  const [isPublicMode] = useState(config.mode === 'canvas');

  useEffect(() => {
    if (!auth) return;

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      
      // REMOVED: Auto-redirect from canvas/embed to auth when user signs in
      // Users should be able to freely navigate between /embed, /canvas, and /auth routes
      // The route should be determined by the URL path, not by auth state
      
      // Canvas/Embed mode: Allow users to stay on current route even after signing in
      // Just update the user state without redirecting
      if (!config.requiresAuth && currentUser) {
        setUser(currentUser);
        // Don't redirect - let users stay on /canvas or /embed if they want
        return;
      }
      
      // Auth mode: use actual auth state
      if (config.requiresAuth) {
        setUser(currentUser);
        
        // Auto-open sidebar when user signs in, close when they sign out
        if (currentUser) {
          setSidebarCollapsed(false);
          
          // Check if user is coming from embed view (Edit button transition)
          const isFromEmbed = isEmbedToCanvasTransition();
          if (isFromEmbed) {
            console.log('🔄 Detected embed-to-auth transition, clearing flag and ensuring sync');
            clearEmbedToCanvasFlag();
            
            // Force Firebase sync if user is already authenticated but coming from embed
            if (!hasInitialSync) {
              console.log('🔄 Forcing Firebase sync for embed-to-auth transition');
              // Note: syncWithFirebase function would need to be passed in or implemented here
              setHasInitialSync(true);
            }
          }
          
          // Check if there's a URL architecture that needs to be processed
          const urlArchId = anonymousArchitectureService.getArchitectureIdFromUrl();
          console.log('🔍 [URL-ARCH] Checking for URL architecture ID:', urlArchId);
          if (urlArchId) {
            // Set flag immediately to prevent Firebase sync
            setUrlArchitectureProcessed(true);
            
            // Process URL architecture immediately
            (async () => {
              try {
                const urlArch = await anonymousArchitectureService.loadAnonymousArchitectureById(urlArchId);
                if (urlArch) {
                  // Set the architecture content
                  setRawGraph(urlArch.rawGraph);
                  
                  // Generate name and save as user architecture
                  // Get user prompt from chat persistence (more reliable than window globals)
                  const persistedMessages = getChatMessages();
                  const lastUserMessage = persistedMessages.filter(msg => msg.sender === 'user').pop();
                  const userPrompt = lastUserMessage?.content || (window as any).originalChatTextInput || (window as any).chatTextInput || '';
                  
                  console.log('🔍 [URL-ARCH] User prompt sources:', {
                    fromPersistence: lastUserMessage?.content || 'none',
                    fromWindow: (window as any).originalChatTextInput || 'none',
                    finalPrompt: userPrompt
                  });
                  
                  let baseChatName;
                  if (userPrompt) {
                    baseChatName = await generateChatName(userPrompt, urlArch.rawGraph);
                    console.log('✅ [URL-ARCH] Generated name from prompt:', baseChatName);
                  } else {
                    // Fallback: generate name from architecture content
                    const nodeLabels = urlArch.rawGraph?.children?.map((node: any) => node.data?.label || node.id).filter(Boolean) || [];
                    const fallbackPrompt = nodeLabels.length > 0 ? `Architecture with: ${nodeLabels.slice(0, 3).join(', ')}` : 'Cloud Architecture';
                    baseChatName = await generateChatName(fallbackPrompt, urlArch.rawGraph);
                    console.log('🔄 [URL-ARCH] Generated name from architecture content:', baseChatName);
                  }
                  
                  // Save as new user architecture
                  const savedArchId = await ArchitectureService.saveArchitecture({
                    name: baseChatName,
                    userId: currentUser.uid,
                    userEmail: currentUser.email || '',
                    rawGraph: urlArch.rawGraph,
                    userPrompt: userPrompt,
                    nodes: [],
                    edges: []
                  });
                  
                  // ALWAYS load existing user architectures to ensure sidebar shows all saved architectures
                  console.log('🔄 Loading all Firebase architectures for authenticated user');
                  const firebaseArchs = await ArchitectureService.loadUserArchitectures(currentUser.uid);
                  const validArchs = firebaseArchs.filter(arch => arch && arch.id && arch.name && arch.rawGraph);
                  
                  // Create the new tab for URL architecture
                  const newUrlArchTab = {
                    id: savedArchId,
                    name: baseChatName,
                    timestamp: new Date(),
                    rawGraph: urlArch.rawGraph,
                    firebaseId: savedArchId,
                    userPrompt: userPrompt,
                    isFromFirebase: true,
                    isShared: false
                  };
                  
                  // Combine with existing architectures and set as current
                  const updatedArchitectures = [...validArchs, newUrlArchTab];
                  setSavedArchitectures(updatedArchitectures);
                  setSelectedArchitectureId(savedArchId);
                  setCurrentChatName(baseChatName);
                  
                  console.log('✅ [URL-ARCH] Successfully processed URL architecture:', {
                    savedArchId,
                    baseChatName,
                    totalArchitectures: updatedArchitectures.length
                  });
                }
              } catch (error) {
                console.error('❌ [URL-ARCH] Failed to process URL architecture:', error);
                // Fallback: load shared architecture normally
                // Note: loadSharedAnonymousArchitecture function would need to be passed in
              }
            })();
          } else if (!hasInitialSync) {
            // No URL architecture - load user's Firebase architectures
            console.log('🔄 No URL architecture found, loading Firebase architectures for authenticated user');
            (async () => {
              try {
                const firebaseArchs = await ArchitectureService.loadUserArchitectures(currentUser.uid);
                const validArchs = firebaseArchs.filter(arch => arch && arch.id && arch.name && arch.rawGraph);
                
                if (validArchs.length > 0) {
                  // Convert Firebase architectures to ArchitectureTab format
                  const convertedArchs = validArchs.map(arch => convertFirebaseArch(arch));
                  
                  // Add to saved architectures, preserving "New Architecture" tab
                  setSavedArchitectures(prev => {
                    const existingArchs = prev.filter(arch => arch.id !== 'new-architecture');
                    // Ensure "New Architecture" tab is always first
                    const newArchTab = prev.find(arch => arch.id === 'new-architecture') || {
                      id: 'new-architecture',
                      name: 'New Architecture',
                      timestamp: new Date(),
                      rawGraph: { id: "root", children: [], edges: [] },
                      isNew: true
                    };
                    return [newArchTab, ...convertedArchs];
                  });
                  
                  // Select the most recent architecture
                  const mostRecent = convertedArchs.sort((a, b) => 
                    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
                  )[0];
                  
                  setSelectedArchitectureId(mostRecent.id);
                  setCurrentChatName(mostRecent.name);
                  
                  // Load the architecture content onto canvas
                  if (mostRecent.rawGraph) {
                    setRawGraph(mostRecent.rawGraph);
                    console.log('✅ [FIREBASE] Loaded architecture content:', {
                      id: mostRecent.id,
                      name: mostRecent.name,
                      nodeCount: mostRecent.rawGraph?.children?.length || 0
                    });
                  }
                  
                  console.log('✅ [FIREBASE] Loaded user architectures:', {
                    count: convertedArchs.length,
                    selected: mostRecent.name
                  });
                } else {
                  // No architectures - ensure "New Architecture" tab exists
                  setSavedArchitectures(prev => {
                    const hasNewArch = prev.some(arch => arch.id === 'new-architecture');
                    if (!hasNewArch) {
                      return [{
                        id: 'new-architecture',
                        name: 'New Architecture',
                        timestamp: new Date(),
                        rawGraph: { id: "root", children: [], edges: [] },
                        isNew: true
                      }];
                    }
                    return prev;
                  });
                  setSelectedArchitectureId('new-architecture');
                  setCurrentChatName('New Architecture');
                }
                
                setHasInitialSync(true);
              } catch (error) {
                console.error('❌ [FIREBASE] Failed to load user architectures:', error);
                setHasInitialSync(true); // Prevent retry loops
              }
            })();
          }
        } else {
          // User signed out
          setSidebarCollapsed(true);
          setHasInitialSync(false);
          
          // Check if there's a shared architecture to load after sign out
          const urlArchId = anonymousArchitectureService.getArchitectureIdFromUrl();
          if (urlArchId) {
            console.log('🔄 User signed out, loading shared architecture from URL:', urlArchId);
            // Note: loadSharedAnonymousArchitecture function would need to be passed in
          }
        }
      }
    });
    return () => unsubscribe();
  }, [isPublicMode, config.mode, config.requiresAuth, hasInitialSync, user]);
}
