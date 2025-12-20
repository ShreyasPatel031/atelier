/**
 * Utility to detect GitHub repository URLs in user input
 */

const GITHUB_REPO_REGEX = /(?:https?:\/\/)?(?:www\.)?github\.com\/[\w\-\.]+\/[\w\-\.]+(?:\/tree\/[\w\-\.]+)?(?:\/blob\/[\w\-\.\/]+)?/gi;
const GITHUB_REPO_SIMPLE_REGEX = /github\.com\/[\w\-\.]+\/[\w\-\.]+/i;

/**
 * Extract GitHub repository URL from text
 * @param {string} text - The input text to search
 * @returns {string|null} - The GitHub repo URL or null if not found
 */
export function extractGitHubRepoUrl(text) {
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
 * @param {string} url - The GitHub URL
 * @returns {string|null} - The branch name or null
 */
export function extractBranchFromUrl(url) {
  if (!url) return null;
  const branchMatch = url.match(/\/tree\/([\w\-\.]+)/);
  return branchMatch ? branchMatch[1] : null;
}

/**
 * Parse GitHub repo URL into owner and repo name
 * @param {string} url - The GitHub repo URL
 * @returns {{owner: string, repo: string, branch: string|null}|null}
 */
export function parseGitHubUrl(url) {
  if (!url) return null;
  
  // Remove protocol and www
  const cleanUrl = url.replace(/^https?:\/\/(www\.)?/, '');
  
  // Extract owner/repo
  const match = cleanUrl.match(/github\.com\/([\w\-\.]+)\/([\w\-\.]+)/);
  if (!match) return null;
  
  const owner = match[1];
  const repo = match[2];
  const branch = extractBranchFromUrl(url);
  
  return { owner, repo, branch };
}

