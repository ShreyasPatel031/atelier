/**
 * Centralized naming utilities for architectures
 * Extracted from InteractiveCanvas to reduce duplication
 */

import { generateChatName } from './chatUtils';

/**
 * Extract component hints from rawGraph for fallback naming
 */
export function componentsHintFromGraph(rawGraph: any): string {
  const labels = rawGraph?.children?.map((n: any) => n?.data?.label || n?.id).filter(Boolean) || [];
  return labels.length ? `Architecture with components: ${labels.slice(0, 5).join(", ")}` : "";
}

/**
 * Generate architecture name with fallback logic
 * This replaces all the scattered name generation code throughout InteractiveCanvas
 */
export async function generateNameWithFallback(rawGraph: any, userPrompt?: string): Promise<string> {
  // Use provided prompt or generate components hint
  const prompt = userPrompt?.trim() || componentsHintFromGraph(rawGraph);
  
  console.log('🤖 Calling generateChatName API with:', { 
    userPrompt: prompt, 
    rawGraph: rawGraph ? { children: rawGraph.children?.length || 0 } : null,
    nodeCount: rawGraph?.children?.length || 0 
  });
  
  try {
    let name = await generateChatName(prompt, rawGraph);
    console.log('🎯 Generated chat name from API:', name);
    
    // If API returned default name, try with better prompt
    if (!name || name === "New Architecture") {
      console.warn('⚠️ API returned default name, trying with better prompt');
      const retryPrompt = componentsHintFromGraph(rawGraph);
      const retry = await generateChatName(retryPrompt, rawGraph);
      console.log('🔄 Retry generated name:', retry);
      
      if (retry && retry !== "New Architecture") {
        name = retry;
      }
    }
    
    return name || "New Architecture";
  } catch (error) {
    console.error('❌ generateChatName API failed, using fallback:', error);
    // Fallback to components-based naming
    const fallbackName = componentsHintFromGraph(rawGraph);
    return fallbackName || "New Architecture";
  }
}

/**
 * Ensure unique architecture name by checking against existing architectures
 */
export function ensureUniqueName(baseName: string, existingArchitectures: any[]): string {
  if (!existingArchitectures || existingArchitectures.length === 0) {
    return baseName;
  }
  
  const existingNames = new Set(existingArchitectures.map(arch => arch.name));
  
  if (!existingNames.has(baseName)) {
    return baseName;
  }
  
  // Add number suffix
  let counter = 1;
  let candidateName = `${baseName} (${counter})`;
  
  while (existingNames.has(candidateName)) {
    counter++;
    candidateName = `${baseName} (${counter})`;
  }
  
  console.log(`📝 Ensured unique name: ${baseName} -> ${candidateName}`);
  return candidateName;
}
