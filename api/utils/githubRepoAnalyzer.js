/**
 * Utility to clone and analyze GitHub repositories
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import { parseGitHubUrl } from './githubRepoDetector.js';

const execAsync = promisify(exec);
const TEMP_REPO_DIR = path.join(process.cwd(), '.temp-repos');

/**
 * Clone a GitHub repository
 * @param {string} repoUrl - The GitHub repository URL
 * @param {string} branch - Optional branch name
 * @returns {Promise<string>} - The local path where the repo was cloned
 */
export async function cloneGitHubRepo(repoUrl, branch = null) {
  try {
    // Ensure temp directory exists
    await fs.mkdir(TEMP_REPO_DIR, { recursive: true });
    
    const parsed = parseGitHubUrl(repoUrl);
    if (!parsed) {
      throw new Error('Invalid GitHub repository URL');
    }
    
    const { owner, repo } = parsed;
    const targetBranch = branch || parsed.branch || 'main';
    const localPath = path.join(TEMP_REPO_DIR, `${owner}_${repo}_${targetBranch}`);
    
    // Check if already cloned
    try {
      const stats = await fs.stat(localPath);
      if (stats.isDirectory()) {
        // Check if it's actually a git repo
        try {
          await fs.stat(path.join(localPath, '.git'));
          console.log(`Repository already exists at ${localPath}, using existing clone`);
          // Try to update it
          try {
            await execAsync(`cd "${localPath}" && git fetch origin && git checkout ${targetBranch} && git pull`, {
              timeout: 30000,
              maxBuffer: 10 * 1024 * 1024
            });
          } catch (e) {
            console.log('Could not update existing repo, using as-is');
          }
          return localPath;
        } catch (e) {
          // Not a git repo, proceed with clone
        }
      }
    } catch (e) {
      // Directory doesn't exist, proceed with clone
    }
    
        // Clone with depth 1 for faster cloning
        // Ensure .git extension if not present
        let cloneUrl = repoUrl;
        if (!cloneUrl.endsWith('.git')) {
          cloneUrl = cloneUrl + '.git';
        }
        const cloneCommand = targetBranch 
          ? `git clone --depth 1 --branch ${targetBranch} ${cloneUrl} ${localPath}`
          : `git clone --depth 1 ${cloneUrl} ${localPath}`;
    
    console.log(`Cloning ${repoUrl} to ${localPath}...`);
    console.log(`Clone command: ${cloneCommand}`);
    await execAsync(cloneCommand, {
      timeout: 120000, // 120 second timeout for large repos
      maxBuffer: 10 * 1024 * 1024 // 10MB buffer
    });
    
    console.log(`Successfully cloned ${repoUrl}`);
    return localPath;
    
  } catch (error) {
    console.error('Error cloning repository:', error.message);
    throw new Error(`Failed to clone repository: ${error.message}`);
  }
}

/**
 * Analyze repository structure and extract key information
 * @param {string} repoPath - Local path to the cloned repository
 * @returns {Promise<object>} - Repository analysis including structure and key files
 */
export async function analyzeRepoStructure(repoPath) {
  try {
    const analysis = {
      structure: {},
      keyFiles: [],
      packageFiles: [],
      readme: null,
      summary: ''
    };
    
    // Get repository structure (top-level files and directories)
    const entries = await fs.readdir(repoPath, { withFileTypes: true });
    
    // Filter out common ignored files
    const ignored = ['.git', 'node_modules', '.next', 'dist', 'build', '.cache'];
    
    for (const entry of entries) {
      if (ignored.includes(entry.name)) continue;
      
      const fullPath = path.join(repoPath, entry.name);
      
      if (entry.isDirectory()) {
        analysis.structure[entry.name] = await analyzeDirectory(fullPath, entry.name, 2); // Limit depth
      } else {
        analysis.structure[entry.name] = { type: 'file' };
        
        // Check for key files
        if (entry.name.match(/package\.json|package-lock\.json|yarn\.lock|pnpm-lock\.yaml/i)) {
          try {
            const content = await fs.readFile(fullPath, 'utf-8');
            analysis.packageFiles.push({
              name: entry.name,
              content: content.substring(0, 2000) // Limit size
            });
          } catch (e) {
            // Skip if can't read
          }
        }
        
        if (entry.name.match(/readme/i)) {
          try {
            analysis.readme = await fs.readFile(fullPath, 'utf-8').then(c => c.substring(0, 5000));
          } catch (e) {
            // Skip if can't read
          }
        }
      }
    }
    
    // Try to find key source files
    analysis.keyFiles = await findKeySourceFiles(repoPath);
    
    // Generate summary
    analysis.summary = generateSummary(analysis);
    
    return analysis;
  } catch (error) {
    console.error('Error analyzing repository:', error.message);
    throw new Error(`Failed to analyze repository: ${error.message}`);
  }
}

/**
 * Recursively analyze directory structure (limited depth)
 */
async function analyzeDirectory(dirPath, dirName, maxDepth, currentDepth = 0) {
  if (currentDepth >= maxDepth) {
    return { type: 'directory', truncated: true };
  }
  
  const structure = { type: 'directory', contents: {} };
  
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    const ignored = ['.git', 'node_modules', '.next', 'dist', 'build', '.cache'];
    
    // Limit number of entries to avoid huge structures
    const limitedEntries = entries.filter(e => !ignored.includes(e.name)).slice(0, 20);
    
    for (const entry of limitedEntries) {
      const fullPath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        structure.contents[entry.name] = await analyzeDirectory(fullPath, entry.name, maxDepth, currentDepth + 1);
      } else {
        structure.contents[entry.name] = { type: 'file' };
      }
    }
  } catch (e) {
    // Skip if can't read
  }
  
  return structure;
}

/**
 * Find key source files in the repository
 */
async function findKeySourceFiles(repoPath, maxFiles = 10) {
  const keyFiles = [];
  const extensions = ['.ts', '.js', '.tsx', '.jsx', '.py', '.java', '.go', '.rs', '.cpp', '.c'];
  
  async function searchDir(dir, depth = 0) {
    if (depth > 3 || keyFiles.length >= maxFiles) return; // Limit depth and file count
    
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      const ignored = ['.git', 'node_modules', '.next', 'dist', 'build', '.cache', 'test', '__pycache__'];
      
      for (const entry of entries) {
        if (keyFiles.length >= maxFiles) break;
        if (ignored.includes(entry.name)) continue;
        
        const fullPath = path.join(dir, entry.name);
        const relPath = path.relative(repoPath, fullPath);
        
        if (entry.isFile()) {
          const ext = path.extname(entry.name);
          if (extensions.includes(ext)) {
            // Check if it's a key file (not in test directories, etc.)
            if (!relPath.toLowerCase().includes('test') && 
                !relPath.toLowerCase().includes('spec') &&
                !entry.name.startsWith('.')) {
              try {
                const stats = await fs.stat(fullPath);
                // Only include files under 100KB
                if (stats.size < 100 * 1024) {
                  const content = await fs.readFile(fullPath, 'utf-8');
                  keyFiles.push({
                    path: relPath,
                    name: entry.name,
                    content: content.substring(0, 3000) // Limit content size
                  });
                }
              } catch (e) {
                // Skip if can't read
              }
            }
          }
        } else if (entry.isDirectory()) {
          await searchDir(fullPath, depth + 1);
        }
      }
    } catch (e) {
      // Skip if can't read directory
    }
  }
  
  await searchDir(repoPath);
  return keyFiles;
}

/**
 * Generate a summary of the repository analysis
 */
function generateSummary(analysis) {
  const lines = [];
  
  lines.push(`Repository Structure:`);
  lines.push(JSON.stringify(analysis.structure, null, 2).substring(0, 2000));
  
  if (analysis.packageFiles.length > 0) {
    lines.push(`\nPackage Files:`);
    analysis.packageFiles.forEach(pkg => {
      lines.push(`${pkg.name}: ${pkg.content.substring(0, 500)}`);
    });
  }
  
  if (analysis.readme) {
    lines.push(`\nREADME:\n${analysis.readme.substring(0, 1000)}`);
  }
  
  if (analysis.keyFiles.length > 0) {
    lines.push(`\nKey Source Files (${analysis.keyFiles.length}):`);
    analysis.keyFiles.forEach(file => {
      lines.push(`\n${file.path}:`);
      lines.push(file.content.substring(0, 500));
    });
  }
  
  return lines.join('\n');
}

/**
 * Clean up cloned repository
 */
export async function cleanupRepo(repoPath) {
  try {
    await fs.rm(repoPath, { recursive: true, force: true });
    console.log(`Cleaned up ${repoPath}`);
  } catch (error) {
    console.error('Error cleaning up repository:', error.message);
    // Don't throw - cleanup is best effort
  }
}

