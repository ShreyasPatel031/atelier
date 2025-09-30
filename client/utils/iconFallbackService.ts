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
            if (!globalBestMatch || similarity > globalBestMatch.similarity) {
              globalBestMatch = { icon: iconName, similarity, provider: 'general' };
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
            const iconEmbedding = this.precomputedData.embeddings[icon];
            if (iconEmbedding) {
              const similarity = this.cosineSimilarity(searchEmbedding, iconEmbedding);
              if (!globalBestMatch || similarity > globalBestMatch.similarity) {
                globalBestMatch = { icon, similarity, provider: currentProvider };
              }
            }
          }
        }
      }

      if (globalBestMatch) { // Always use best match, no matter how low similarity
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