import { iconLists } from "../generated/iconLists";

interface PrecomputedData {
  embeddings: { [iconName: string]: number[] };
  similarities: { [provider: string]: { [iconName: string]: { [otherIcon: string]: number } } };
}

class IconFallbackService {
  private fallbackCache: { [key: string]: string } = {};
  private embeddingCache: { [key: string]: number[] } = {};
  private precomputedData: PrecomputedData | null = null;

  constructor() {
    if (typeof window === 'undefined') {
      return;
    }
    
    this.loadPrecomputedData();
  }

  private async loadPrecomputedData() {
    try {
      const response = await fetch('/precomputed-icon-embeddings.json');
      if (!response.ok) {
        throw new Error(`Failed to load precomputed data: ${response.status}`);
      }
      this.precomputedData = await response.json();
    } catch (error) {
      this.precomputedData = null;
    }
  }

  private async getEmbedding(text: string): Promise<number[] | null> {
    const cacheKey = `embedding_${text.toLowerCase()}`;
    if (this.embeddingCache[cacheKey]) {
      return this.embeddingCache[cacheKey];
    }

    try {
      const response = await fetch('/api/embed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });

      if (!response.ok) {
        throw new Error(`Embedding API failed: ${response.status}`);
      }

      const data = await response.json();
      const embedding = data.embedding;
      this.embeddingCache[cacheKey] = embedding;
      return embedding;
    } catch (error) {
      return null;
    }
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
    const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
    return dotProduct / (magnitudeA * magnitudeB);
  }

  public async findFallbackIcon(missingIconName: string): Promise<string | null> {
    if (typeof window === 'undefined') {
      return null;
    }

    // Check cache first
    if (this.fallbackCache[missingIconName]) {
      return this.fallbackCache[missingIconName];
    }

    // Wait for precomputed data if not loaded yet
    if (!this.precomputedData) {
      await this.loadPrecomputedData();
    }

    if (!this.precomputedData) {
      return null;
    }

    try {
      // Searching fallback silently
      
      // Handle both prefixed (gcp_compute) and non-prefixed (server) icon names
      let provider: string;
      let searchTerm: string;
      
      const prefixMatch = missingIconName.match(/^(aws|gcp|azure)_(.+)$/);
      if (prefixMatch) {
        [, provider, searchTerm] = prefixMatch;
        // Prefixed name detected
      } else {
        // For non-prefixed names, search across all providers to find the best semantic match
        provider = 'gcp'; // Default to GCP for result formatting, but we'll search all
        searchTerm = missingIconName;
        // Non-prefixed name detected
      }

      // Get embedding for search term (only 1 API call)
      const searchEmbedding = await this.getEmbedding(searchTerm.replace(/_/g, ' '));
      if (!searchEmbedding) {
        console.log(`❌ IconFallback: Could not get embedding for "${searchTerm}"`);
        return null;
      }

      // For non-prefixed names, prioritize general icons first, then cloud provider icons
      let globalBestMatch: { icon: string; similarity: number; provider: string } | null = null;
      let searchProviders: string[] = [];
      
      if (prefixMatch) {
        // Prefixed names: search only the specified provider
        searchProviders = [provider];
      } else {
        // Non-prefixed names: first search general icons, then cloud providers
        // Search through all embeddings to find general icons (no provider prefix)
        for (const [iconName, iconEmbedding] of Object.entries(this.precomputedData.embeddings)) {
          // General icons don't have provider prefixes (aws_, gcp_, azure_)
          if (!iconName.match(/^(aws|gcp|azure)_/)) {
            const similarity = this.cosineSimilarity(searchEmbedding, iconEmbedding);
            
            // Determine provider: prioritize generic icons, default to general for non-prefixed icons
            let actualProvider: string = 'general'; // Default to general for non-prefixed icons
            let adjustedSimilarity = similarity;
            
            if (iconLists.generic.includes(iconName)) {
              // If in generic list, always treat as general (even if also in provider lists)
              actualProvider = 'general';
              // CRITICAL: Boost similarity for generic icons to prefer them over provider icons
              // This ensures that generic icons (like mobile_app) are preferred over provider icons
              // (like console_mobile_application) when both are valid matches
              adjustedSimilarity = similarity + 0.1; // Small boost to prefer generic icons
            } else {
              // If NOT in generic, check if it exists ONLY in a provider list
              for (const provider of ['gcp', 'aws', 'azure'] as const) {
                const providerIcons = iconLists[provider];
                if (providerIcons) {
                  const flatProviderIcons = Object.values(providerIcons).flat();
                  if (flatProviderIcons.includes(iconName)) {
                    // Found in provider list, but NOT in generic - mark as provider icon
                    actualProvider = provider;
                    break;
                  }
                }
              }
              // If not found in any iconLists, stays 'general' (default for non-prefixed icons)
            }
            
            if (!globalBestMatch || adjustedSimilarity > globalBestMatch.similarity) {
              globalBestMatch = { icon: iconName, similarity: adjustedSimilarity, provider: actualProvider };
            }
          }
        }
        
        // Also search cloud providers to find the absolute best match across all icons
        searchProviders = ['gcp', 'aws', 'azure'];
      }

      // Search cloud provider icons to find absolute best match across all providers
      if (searchProviders.length > 0) {
        for (const currentProvider of searchProviders) {
          const providerIcons = iconLists[currentProvider as keyof typeof iconLists];
          if (!providerIcons) {
            continue;
          }

          const availableIcons = Object.values(providerIcons).flat();
          if (availableIcons.length === 0) {
            continue;
          }

          // Compare against precomputed icon embeddings (no API calls)
          for (const icon of availableIcons) {
            // CRITICAL: Skip icons that are in generic list - they should be treated as general icons,
            // not provider icons, even if they also exist in provider lists
            if (iconLists.generic.includes(icon)) {
              continue; // Skip this icon - it's already handled as a general icon in the first pass
            }
            
            const iconEmbedding = this.precomputedData.embeddings[icon];
            if (iconEmbedding) {
              const similarity = this.cosineSimilarity(searchEmbedding, iconEmbedding);
              // CRITICAL: Only allow provider icons to override if current best match is NOT a general icon
              // If we already have a general icon match, don't let provider icons override it
              // This ensures general icons (like browser_client) stay as general icons
              const shouldUpdate = !globalBestMatch || 
                (globalBestMatch.provider !== 'general' && similarity > globalBestMatch.similarity);
              
              if (shouldUpdate) {
                globalBestMatch = { icon, similarity, provider: currentProvider };
              }
            }
          }
        }
      }

      if (globalBestMatch) { // Always use best match, no matter how low similarity
        // CRITICAL: If best match is a provider icon, check if there's a semantically similar generic icon
        // This ensures that generic icons (like mobile_app) are preferred over provider icons
        // (like console_mobile_application) for non-prefixed search terms
        if (globalBestMatch.provider !== 'general' && !prefixMatch) {
          // Extract keywords from missing icon name (e.g., "mobile_client" -> ["mobile", "client"])
          const searchKeywords = missingIconName.toLowerCase().split(/[_-]/).filter(k => k.length > 2);
          
          // Check generic icons for semantic matches
          for (const genericIcon of iconLists.generic) {
            const genericKeywords = genericIcon.toLowerCase().split(/[_-]/).filter(k => k.length > 2);
            
            // Check if there's significant keyword overlap (e.g., "mobile_app" matches "mobile_client")
            const matchingKeywords = searchKeywords.filter(keyword => 
              genericKeywords.some(genKeyword => genKeyword.includes(keyword) || keyword.includes(genKeyword))
            );
            
            // Prefer matches with the first keyword (primary semantic match)
            const firstKeywordMatch = searchKeywords.length > 0 && 
              genericKeywords.some(genKeyword => 
                genKeyword.includes(searchKeywords[0]) || searchKeywords[0].includes(genKeyword)
              );
            
            // If at least one significant keyword matches, consider this generic icon
            // Prioritize matches that include the first keyword (primary semantic match)
            if (matchingKeywords.length > 0 && genericIcon.length > 0) {
              // Boost score for first keyword matches (e.g., "mobile" in "mobile_app" for "mobile_client")
              const matchScore = firstKeywordMatch ? matchingKeywords.length + 2 : matchingKeywords.length;
              const genericEmbedding = this.precomputedData.embeddings[genericIcon];
              if (genericEmbedding) {
                const genericSimilarity = this.cosineSimilarity(searchEmbedding, genericEmbedding);
                // Prefer generic if similarity is reasonable (within 0.25 of provider match)
                if (genericSimilarity >= globalBestMatch.similarity - 0.25) {
                  globalBestMatch = { 
                    icon: genericIcon, 
                    similarity: genericSimilarity + 0.15, // Boost to prefer generic
                    provider: 'general' 
                  };
                  break;
                }
              } else {
                // Generic icon not in embeddings, but still prefer it if keywords strongly match
                // Prioritize first keyword matches (e.g., "mobile" in "mobile_app" for "mobile_client")
                const firstKeywordMatch = searchKeywords.length > 0 && 
                  genericKeywords.some(genKeyword => 
                    genKeyword.includes(searchKeywords[0]) || searchKeywords[0].includes(genKeyword)
                  );
                const significantMatch = firstKeywordMatch && matchingKeywords.length >= 1;
                if (significantMatch) {
                  // Use the generic icon even without embedding similarity
                  // Higher similarity for first keyword matches
                  globalBestMatch = { 
                    icon: genericIcon, 
                    similarity: 0.9, // High similarity to ensure it wins over provider icon
                    provider: 'general' 
                  };
                  break;
                }
              }
            }
          }
        }
        
        // For general icons, don't add provider prefix
        const fallbackIcon = globalBestMatch.provider === 'general' 
          ? globalBestMatch.icon 
          : `${globalBestMatch.provider}_${globalBestMatch.icon}`;
        
        // CRITICAL: Verify the fallback icon actually exists as a file
        const iconExists = await this.verifyIconExists(fallbackIcon);
        if (!iconExists) {
          // Try to find the next best match that actually exists
          return await this.findNextBestMatch(missingIconName, searchEmbedding, globalBestMatch);
        }
        
        // Found valid fallback
        this.fallbackCache[missingIconName] = fallbackIcon;
        return fallbackIcon;
      } else {
        return null;
      }

    } catch (error) {
      return null;
    }
  }

  private async verifyIconExists(iconName: string): Promise<boolean> {
    try {
      // Check if it's a general icon (no provider prefix)
      if (!iconName.includes('_') || (!iconName.startsWith('aws_') && !iconName.startsWith('gcp_') && !iconName.startsWith('azure_'))) {
        // Try both PNG and SVG for general icons
        const pngPath = `/assets/canvas/${iconName}.png`;
        const svgPath = `/assets/canvas/${iconName}.svg`;
        
        const pngResponse = await fetch(pngPath, { method: 'HEAD' });
        const svgResponse = await fetch(svgPath, { method: 'HEAD' });
        
        return pngResponse.ok || svgResponse.ok;
      } else {
        // Provider-specific icon
        const [provider, actualIconName] = iconName.split('_', 2);
        const iconPath = `/icons/${provider}/${actualIconName}.png`;
        const response = await fetch(iconPath, { method: 'HEAD' });
        return response.ok;
      }
    } catch (error) {
      return false;
    }
  }

  private async findNextBestMatch(
    missingIconName: string, 
    searchEmbedding: number[], 
    excludeMatch: { icon: string; provider: string; similarity: number }
  ): Promise<string | null> {
    let nextBestMatch: { icon: string; similarity: number; provider: string } | null = null;

    // Search through all embeddings again, excluding the already found match
    for (const [iconName, iconEmbedding] of Object.entries(this.precomputedData!.embeddings)) {
      // Skip the already found match
      if (iconName === excludeMatch.icon) continue;
      
      const similarity = this.cosineSimilarity(searchEmbedding, iconEmbedding);
      
      if (!nextBestMatch || similarity > nextBestMatch.similarity) {
        const isGeneralIcon = !iconName.match(/^(aws|gcp|azure)_/);
        
        nextBestMatch = {
          icon: iconName,
          similarity,
          provider: isGeneralIcon ? 'general' : iconName.split('_')[0]
        };
      }
    }

    if (nextBestMatch) {
      const fallbackIcon = nextBestMatch.provider === 'general' 
        ? nextBestMatch.icon 
        : `${nextBestMatch.provider}_${nextBestMatch.icon}`;
      
      const iconExists = await this.verifyIconExists(fallbackIcon);
      if (iconExists) {
        this.fallbackCache[missingIconName] = fallbackIcon;
        console.log(`✅ IconFallback: Found alternative fallback "${missingIconName}" → "${fallbackIcon}"`);
        return fallbackIcon;
      }
    }

    console.log(`❌ IconFallback: No valid fallback icons found for "${missingIconName}"`);
    return null;
  }
}

export const iconFallbackService = new IconFallbackService();