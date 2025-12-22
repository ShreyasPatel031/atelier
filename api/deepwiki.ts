import WebSocket from 'ws';
import fs from 'fs';
import path from 'path';

const PYTHON_WS_URL = process.env.PYTHON_WS_URL || 'ws://localhost:8001/ws/chat';
const REQUEST_TIMEOUT = 180000; // 3 minutes

/**
 * Extract Mermaid diagram from response text
 */
function extractMermaidDiagram(response: string): string | null {
  if (!response || typeof response !== 'string') {
    return null;
  }

  // Look for ```mermaid blocks
  const mermaidMatch = response.match(/```mermaid\s*\n([\s\S]*?)\n```/);
  if (mermaidMatch) {
    return mermaidMatch[1].trim();
  }

  // Try without newlines
  const mermaidMatch2 = response.match(/```mermaid([\s\S]*?)```/);
  if (mermaidMatch2) {
    return mermaidMatch2[1].trim();
  }

  // If response looks like mermaid content directly
  const trimmed = response.trim();
  if (/^(graph|flowchart|sequenceDiagram|classDiagram|stateDiagram)/.test(trimmed)) {
    return trimmed;
  }

  // Try to find mermaid content in lines
  const lines = trimmed.split('\n');
  let inDiagram = false;
  const diagramLines: string[] = [];
  
  for (const line of lines) {
    if (line.trim().match(/^(graph|flowchart|sequenceDiagram|classDiagram|stateDiagram)/)) {
      inDiagram = true;
    }
    if (inDiagram) {
      diagramLines.push(line);
    }
  }

  if (diagramLines.length > 0) {
    return diagramLines.join('\n');
  }

  return null;
}

/**
 * Parse GitHub URL to extract base repo URL (strips /tree/branch paths)
 * Handles URLs like:
 * - https://github.com/user/repo
 * - https://github.com/user/repo/tree/branch
 * - https://github.com/user/repo/tree/branch/path
 * 
 * Note: Currently strips branch paths and uses default branch.
 * Branch support can be added later if backend supports it.
 */
function parseGitHubUrl(url: string): string {
  // Remove trailing slashes
  url = url.trim().replace(/\/+$/, '');
  
  // Match GitHub URL patterns and extract base repo (strip /tree/branch)
  const treeMatch = url.match(/^https?:\/\/github\.com\/([^\/]+)\/([^\/]+)/);
  if (treeMatch) {
    const [, owner, repo] = treeMatch;
    return `https://github.com/${owner}/${repo}`;
  }
  
  // If it doesn't match, return as-is (might be GitLab/Bitbucket)
  return url;
}

/**
 * Call DeepWiki backend to get Mermaid diagram for a codebase URL
 */
export async function getMermaidDiagramFromDeepWiki(repoUrl: string): Promise<string> {
  console.log('🔍 [DEEPWIKI] getMermaidDiagramFromDeepWiki called with:', repoUrl);
  
  // Parse GitHub URL to extract base repo (strips /tree/branch paths)
  const baseRepoUrl = parseGitHubUrl(repoUrl);
  if (baseRepoUrl !== repoUrl) {
    console.log('🔍 [DEEPWIKI] Parsed URL - stripped branch/path:', repoUrl, '->', baseRepoUrl);
  }
  
  console.log('🔍 [DEEPWIKI] WebSocket URL:', PYTHON_WS_URL);
  
  return new Promise((resolve, reject) => {
    // #region agent log
    const logPath = '/Users/shreyaspatel/Desktop/Code/system-design/.cursor/debug.log';
    console.log('🔍 [DEEPWIKI] Log path:', logPath);
    const logEntry = JSON.stringify({
      location: 'api/deepwiki.ts:56',
      message: 'Creating WebSocket connection',
      data: {
        wsUrl: PYTHON_WS_URL,
        originalRepoUrl: repoUrl,
        parsedRepoUrl: baseRepoUrl
      },
      timestamp: Date.now(),
      sessionId: 'debug-session',
      runId: 'run1',
      hypothesisId: 'F'
    }) + '\n';
    fs.appendFile(logPath, logEntry, (err: any) => {
      if (err) console.error('🔍 [DEEPWIKI] Failed to write log:', err);
      else console.log('🔍 [DEEPWIKI] Log written successfully');
    });
    // #endregion
    
    console.log('🔍 [DEEPWIKI] Creating WebSocket...');
    const ws = new WebSocket(PYTHON_WS_URL);
    console.log('🔍 [DEEPWIKI] WebSocket object created');

    let isResolved = false; // Flag to prevent double resolution
    const timeoutId = setTimeout(() => {
      if (!isResolved) {
        isResolved = true;
        ws.close();
        reject(new Error('WebSocket timeout after 180 seconds'));
      }
    }, REQUEST_TIMEOUT);

    ws.on('open', () => {
      console.log('✅ [DEEPWIKI] WebSocket connected');

      // #region agent log
      const logPath = '/Users/shreyaspatel/Desktop/Code/system-design/.cursor/debug.log';
      const logEntry = JSON.stringify({
        location: 'api/deepwiki.ts:65',
        message: 'DeepWiki WebSocket opened, sending request',
        data: {
          originalRepoUrl: repoUrl,
          parsedRepoUrl: baseRepoUrl,
          wsUrl: PYTHON_WS_URL
        },
        timestamp: Date.now(),
        sessionId: 'debug-session',
        runId: 'run1',
        hypothesisId: 'F'
      }) + '\n';
      fs.appendFile(logPath, logEntry, () => {});
      // #endregion

      const request = {
        repo_url: baseRepoUrl,
        type: 'github',
        messages: [
          {
            role: 'user',
            content: 'Analyze the codebase architecture and generate a comprehensive Mermaid.js diagram showing main components, relationships, architecture patterns, entry points, and external dependencies. Return ONLY the mermaid code block.'
          }
        ],
        provider: process.env.PROVIDER || 'openai',
        model: process.env.MODEL || 'gpt-4o',
        language: 'en'
      };

      console.log('🔍 [DEEPWIKI] Sending request:', JSON.stringify(request, null, 2));
      ws.send(JSON.stringify(request));
    });

    let responseText = '';

    ws.on('message', (data: WebSocket.Data) => {
      const message = data.toString();
      
      // #region agent log
      const logPath = '/Users/shreyaspatel/Desktop/Code/system-design/.cursor/debug.log';
      const logEntry = JSON.stringify({
        location: 'api/deepwiki.ts:87',
        message: 'DeepWiki WebSocket message received',
        data: {
          messageLength: message.length,
          messagePreview: message.substring(0, 200),
          isMetrics: message.startsWith('[METRICS_START]'),
          isDone: message === '[DONE]',
          isError: message === '[ERROR]',
          accumulatedLength: responseText.length
        },
        timestamp: Date.now(),
        sessionId: 'debug-session',
        runId: 'run1',
        hypothesisId: 'F'
      }) + '\n';
      fs.appendFile(logPath, logEntry, () => {});
      // #endregion
      
      // Skip metrics messages
      if (message.startsWith('[METRICS_START]')) {
        return;
      }

      // Check for end markers
      if (message === '[DONE]') {
        clearTimeout(timeoutId);
        // Process response before closing
        if (!isResolved && responseText) {
          const diagram = extractMermaidDiagram(responseText);
          if (diagram) {
            isResolved = true;
            ws.close();
            resolve(diagram);
            return;
          } else {
            isResolved = true;
            ws.close();
            reject(new Error('Failed to extract Mermaid diagram from response'));
            return;
          }
        } else if (!isResolved) {
          isResolved = true;
          ws.close();
          reject(new Error('Backend returned [DONE] but no response text was received'));
          return;
        }
      }

      if (message === '[ERROR]') {
        clearTimeout(timeoutId);
        if (!isResolved) {
          isResolved = true;
          ws.close();
          reject(new Error('Backend returned [ERROR]'));
        }
        return;
      }

      // Accumulate response (skip [DONE] and [ERROR] markers)
      if (message !== '[DONE]' && message !== '[ERROR]') {
        responseText += message;
      }
    });

    ws.on('close', () => {
      clearTimeout(timeoutId);

      // Only process if not already resolved (handles case where connection closes without [DONE])
      if (!isResolved && responseText) {
        // #region agent log
        const logPath = '/Users/shreyaspatel/Desktop/Code/system-design/.cursor/debug.log';
        const logEntry = JSON.stringify({
          location: 'api/deepwiki.ts:113',
          message: 'DeepWiki response received',
          data: {
            responseLength: responseText.length,
            responsePreview: responseText.substring(0, 500),
            responseEnd: responseText.substring(Math.max(0, responseText.length - 200)),
            hasMermaidBlock: responseText.includes('```mermaid'),
            hasGraphKeyword: /(graph|flowchart|sequenceDiagram|classDiagram|stateDiagram)/.test(responseText)
          },
          timestamp: Date.now(),
          sessionId: 'debug-session',
          runId: 'run1',
          hypothesisId: 'F'
        }) + '\n';
        fs.appendFile(logPath, logEntry, () => {});
        // #endregion

        const diagram = extractMermaidDiagram(responseText);
        if (diagram) {
          // #region agent log
          const logEntry2 = JSON.stringify({
            location: 'api/deepwiki.ts:140',
            message: 'Mermaid diagram extracted successfully',
            data: {
              diagramLength: diagram.length,
              diagramPreview: diagram.substring(0, 200)
            },
            timestamp: Date.now(),
            sessionId: 'debug-session',
            runId: 'run1',
            hypothesisId: 'F'
          }) + '\n';
          fs.appendFile(logPath, logEntry2, () => {});
          // #endregion
          isResolved = true;
          resolve(diagram);
        } else {
          // #region agent log
          const logEntry3 = JSON.stringify({
            location: 'api/deepwiki.ts:150',
            message: 'Failed to extract Mermaid diagram',
            data: {
              responseText: responseText,
              responseLength: responseText.length,
              extractAttempts: {
                mermaidBlock: responseText.match(/```mermaid[\s\S]*?```/) !== null,
                directMermaid: /^(graph|flowchart|sequenceDiagram|classDiagram|stateDiagram)/.test(responseText.trim()),
                linesWithKeywords: responseText.split('\n').filter(l => /(graph|flowchart|sequenceDiagram|classDiagram|stateDiagram)/.test(l)).length
              }
            },
            timestamp: Date.now(),
            sessionId: 'debug-session',
            runId: 'run1',
            hypothesisId: 'F'
          }) + '\n';
          fs.appendFile(logPath, logEntry3, () => {});
          // #endregion
          isResolved = true;
          reject(new Error('Failed to extract Mermaid diagram from response'));
        }
      } else if (!isResolved) {
        // #region agent log
        const logPath = '/Users/shreyaspatel/Desktop/Code/system-design/.cursor/debug.log';
        const logEntry = JSON.stringify({
          location: 'api/deepwiki.ts:170',
          message: 'No response text received from DeepWiki',
          data: {
            responseTextEmpty: true
          },
          timestamp: Date.now(),
          sessionId: 'debug-session',
          runId: 'run1',
          hypothesisId: 'F'
        }) + '\n';
        fs.appendFile(logPath, logEntry, () => {});
        // #endregion
        isResolved = true;
        reject(new Error('No response received from Python backend'));
      }
    });

    ws.on('error', (error: Error) => {
      clearTimeout(timeoutId);
      const errorMsg = error.message || error.toString() || 'Unknown error';
      
      // #region agent log
      const logPath = '/Users/shreyaspatel/Desktop/Code/system-design/.cursor/debug.log';
      const logEntry = JSON.stringify({
        location: 'api/deepwiki.ts:244',
        message: 'DeepWiki WebSocket error',
        data: {
          error: errorMsg,
          errorStack: error.stack,
          wsUrl: PYTHON_WS_URL,
          repoUrl: repoUrl
        },
        timestamp: Date.now(),
        sessionId: 'debug-session',
        runId: 'run1',
        hypothesisId: 'F'
      }) + '\n';
      fs.appendFile(logPath, logEntry, () => {});
      // #endregion
      
      console.error('❌ DeepWiki WebSocket error:', errorMsg);
      console.error('💡 To start the Python backend, run:');
      console.error('   cd /Users/shreyaspatel/Desktop/Code/deepwiki-open');
      console.error('   export PYTHONPATH=/Users/shreyaspatel/Desktop/Code/deepwiki-open:$PYTHONPATH');
      console.error('   poetry run python -m uvicorn api.api:app --host 0.0.0.0 --port 8001');
      console.error('   Or use: ./scripts/start-deepwiki-backend.sh');
      reject(new Error(`WebSocket error: ${errorMsg}. Make sure the Python backend is running at ${PYTHON_WS_URL}`));
    });
  });
}


