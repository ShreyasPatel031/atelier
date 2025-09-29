/**
 * Centralized anonymous architecture save/update utilities
 * Extracted from InteractiveCanvas to reduce duplication
 */

import { Timestamp } from 'firebase/firestore';
import { generateNameWithFallback } from './naming';

export interface AnonymousArchitectureService {
  getArchitectureIdFromUrl(): string | null;
  saveAnonymousArchitecture(name: string, graph: any): Promise<string>;
  updateAnonymousArchitecture(id: string, payload: any): Promise<void>;
}

/**
 * Ensures anonymous architecture is saved/updated with ID reuse
 * This replaces repeated anonymous save logic throughout InteractiveCanvas
 */
export async function ensureAnonymousSaved({
  rawGraph,
  userPrompt,
  anonymousService,
  existingId,
  metadata = {},
}: {
  rawGraph: any;
  userPrompt?: string;
  anonymousService: AnonymousArchitectureService;
  existingId?: string | null;
  metadata?: any;
}) {
  console.log('💾 ensureAnonymousSaved called with:', { 
    hasGraph: !!rawGraph,
    hasPrompt: !!userPrompt,
    hasExisting: !!existingId,
    nodeCount: rawGraph?.children?.length || 0
  });

  try {
    const id = existingId ?? anonymousService.getArchitectureIdFromUrl();
    
    if (id) {
      // Update existing anonymous architecture
      console.log('🔄 Updating existing anonymous architecture:', id);
      
      const updatePayload = {
        rawGraph,
        timestamp: Timestamp.now(),
        ...metadata
      };
      
      await anonymousService.updateAnonymousArchitecture(id, updatePayload);
      console.log('✅ Anonymous architecture updated successfully');
      return id;
    }
    
    // Create new anonymous architecture with AI-generated name
    console.log('🤖 Generating name for new anonymous architecture');
    const name = await generateNameWithFallback(rawGraph, userPrompt);
    
    const newId = await anonymousService.saveAnonymousArchitecture(name, rawGraph);
    console.log('✅ New anonymous architecture saved with ID:', newId);
    return newId;
    
  } catch (error) {
    console.error('❌ ensureAnonymousSaved failed:', error);
    
    // Check if this is the expected "No document to update" error after architecture transfer
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('No document to update') || errorMessage.includes('Document does not exist')) {
      console.log('📝 Architecture may已被 transferred to user account, this is expected');
      return null;
    }
    
    throw error;
  }
}

/**
 * Simple anonymous share functionality
 * Creates a copy of an architecture for sharing
 */
export async function createAnonymousShare({
  architectureName,
  rawGraph,
  anonymousService,
}: {
  architectureName: string;
  rawGraph: any;
  anonymousService: AnonymousArchitectureService;
}) {
  console.log('📤 Creating anonymous share copy');
  
  const anonymousId = await anonymousService.saveAnonymousArchitecture(
    `${architectureName} (Shared)`,
    rawGraph
  );
  
  console.log('✅ Anonymous share created with ID:', anonymousId);
  return anonymousId;
}

/**
 * Handle auto-save for anonymous architectures in public mode
 * Simplified version for periodic saves
 */
export async function autoSaveAnonymous({
  rawGraph,
  anonymousService,
}: {
  rawGraph: any;
  anonymousService: AnonymousArchitectureService;
}) {
  console.log('⏰ Auto-saving anonymous architecture...');
  
  try {
    const architectureName = `Architecture ${new Date().toLocaleDateString()}`;
    const newArchId = await anonymousService.saveAnonymousArchitecture(
      architectureName,
      rawGraph
    );
    
    console.log('✅ Auto-save completed with ID:', newArchId);
    return newArchId;
  } catch (error) {
    console.error('❌ Auto-save failed:', error);
    return null;
  }
}
