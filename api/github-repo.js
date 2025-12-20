/**
 * API endpoint to analyze GitHub repositories
 */

import { cloneGitHubRepo, analyzeRepoStructure, cleanupRepo } from './utils/githubRepoAnalyzer.js';
import { extractGitHubRepoUrl, extractBranchFromUrl, parseGitHubUrl } from './utils/githubRepoDetector.js';

export default async function handler(req, res) {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { repoUrl, branch = null } = req.body;
    
    if (!repoUrl) {
      res.status(400).json({ error: 'repoUrl is required' });
      return;
    }

    // Extract and validate GitHub URL
    const extractedUrl = extractGitHubRepoUrl(repoUrl);
    if (!extractedUrl) {
      res.status(400).json({ error: 'Invalid GitHub repository URL' });
      return;
    }

    // Extract branch if not provided
    const targetBranch = branch || extractBranchFromUrl(extractedUrl);

    console.log(`🔍 Analyzing GitHub repository: ${extractedUrl}${targetBranch ? ` (branch: ${targetBranch})` : ''}`);

    // Clone the repository
    const repoPath = await cloneGitHubRepo(extractedUrl, targetBranch);

    try {
      // Analyze the repository structure
      const analysis = await analyzeRepoStructure(repoPath);

      // Return the analysis
      res.status(200).json({
        success: true,
        repoUrl: extractedUrl,
        branch: targetBranch,
        analysis: {
          structure: analysis.structure,
          keyFiles: analysis.keyFiles,
          packageFiles: analysis.packageFiles,
          readme: analysis.readme,
          summary: analysis.summary
        }
      });
    } finally {
      // Cleanup is optional - we might want to cache repos
      // await cleanupRepo(repoPath);
    }

  } catch (error) {
    console.error('Error analyzing GitHub repository:', error);
    res.status(500).json({ 
      error: 'Failed to analyze repository',
      message: error.message 
    });
  }
}

