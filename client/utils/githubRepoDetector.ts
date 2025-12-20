/**
 * Utility to detect GitHub repository URLs in user input
 */

const GITHUB_REPO_REGEX = /(?:https?:\/\/)?(?:www\.)?github\.com\/[\w\-\.]+\/[\w\-\.]+(?:\/tree\/[\w\-\.]+)?(?:\/blob\/[\w\-\.\/]+)?/gi;
const GITHUB_REPO_SIMPLE_REGEX = /github\.com\/[\w\-\.]+\/[\w\-\.]+/i;

/**
 * Extract GitHub repository URL from text
 */
export function extractGitHubRepoUrl(text: string): string | null {
  if (!text || typeof text !== 'string') return null;
  
  // Try to find a GitHub repo URL
  const match = text.match(GITHUB_REPO_REGEX);
  if (match && match[0]) {
    let url = match[0];
    // Clean up the URL - remove /tree, /blob paths
    url = url.replace(/\/tree\/[\w\-\.]+.*$/, '');
    url = url.replace(/\/blob\/[\w\-\.\/]+.*$/, '');
    // Ensure it starts with https://
    if (!url.startsWith('http')) {
      url = 'https://' + url;
    }
    return url;
  }
  
  // Try simple regex
  const simpleMatch = text.match(GITHUB_REPO_SIMPLE_REGEX);
  if (simpleMatch && simpleMatch[0]) {
    return 'https://' + simpleMatch[0].replace(/\/tree\/.*$/, '').replace(/\/blob\/.*$/, '');
  }
  
  return null;
}

/**
 * Extract branch name from GitHub URL if present
 */
export function extractBranchFromUrl(url: string): string | null {
  if (!url) return null;
  const branchMatch = url.match(/\/tree\/([\w\-\.]+)/);
  return branchMatch ? branchMatch[1] : null;
}

/**
 * Analyze a GitHub repository
 */
export async function analyzeGitHubRepo(repoUrl: string, branch?: string | null): Promise<any> {
  try {
    const response = await fetch('/api/github-repo', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ repoUrl, branch }),
    });

    if (!response.ok) {
      throw new Error(`Failed to analyze repository: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error analyzing GitHub repository:', error);
    throw error;
  }
}

