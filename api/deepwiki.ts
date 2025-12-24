import WebSocket from 'ws';
import fs from 'fs';
import path from 'path';

const PYTHON_WS_URL = process.env.PYTHON_WS_URL || 'ws://localhost:8001/ws/chat';
const REQUEST_TIMEOUT = 180000; // 3 minutes

/**
 * Extract Mermaid diagram from response text
 */
function extractMermaidDiagram(response: string): string | null {
  const logPath = '/Users/shreyaspatel/Desktop/Code/system-design/.cursor/debug.log';
  
  // #region agent log
  const logEntry = JSON.stringify({
    location: 'api/deepwiki.ts:extractMermaidDiagram:entry',
    message: 'extractMermaidDiagram called',
    data: {
      responseLength: response ? response.length : 0,
      responseType: typeof response,
      responseIsNull: response === null,
      responseIsUndefined: response === undefined,
      responsePreview: response ? response.substring(0, 500) : null
    },
    timestamp: Date.now(),
    sessionId: 'debug-session',
    runId: 'run1',
    hypothesisId: 'E'
  }) + '\n';
  fs.appendFileSync(logPath, logEntry);
  // #endregion
  
  if (!response || typeof response !== 'string') {
    // #region agent log
    const logEntry2 = JSON.stringify({
      location: 'api/deepwiki.ts:extractMermaidDiagram:earlyReturn',
      message: 'Early return - invalid response',
      data: { response: response, type: typeof response },
      timestamp: Date.now(),
      sessionId: 'debug-session',
      runId: 'run1',
      hypothesisId: 'E'
    }) + '\n';
    fs.appendFileSync(logPath, logEntry2);
    // #endregion
    return null;
  }

  // Look for ```mermaid blocks
  const mermaidMatch = response.match(/```mermaid\s*\n([\s\S]*?)\n```/);
  if (mermaidMatch) {
    // #region agent log
    const logEntry3 = JSON.stringify({
      location: 'api/deepwiki.ts:extractMermaidDiagram:match1',
      message: 'Found mermaid block with newlines',
      data: { extractedLength: mermaidMatch[1].trim().length },
      timestamp: Date.now(),
      sessionId: 'debug-session',
      runId: 'run1',
      hypothesisId: 'E'
    }) + '\n';
    fs.appendFileSync(logPath, logEntry3);
    // #endregion
    return mermaidMatch[1].trim();
  }

  // Try without newlines
  const mermaidMatch2 = response.match(/```mermaid([\s\S]*?)```/);
  if (mermaidMatch2) {
    // #region agent log
    const logEntry4 = JSON.stringify({
      location: 'api/deepwiki.ts:extractMermaidDiagram:match2',
      message: 'Found mermaid block without newlines',
      data: { extractedLength: mermaidMatch2[1].trim().length },
      timestamp: Date.now(),
      sessionId: 'debug-session',
      runId: 'run1',
      hypothesisId: 'E'
    }) + '\n';
    fs.appendFileSync(logPath, logEntry4);
    // #endregion
    return mermaidMatch2[1].trim();
  }

  // If response looks like mermaid content directly
  const trimmed = response.trim();
  const startsWithGraph = /^(graph|flowchart|sequenceDiagram|classDiagram|stateDiagram)/.test(trimmed);
  if (startsWithGraph) {
    // #region agent log
    const logEntry5 = JSON.stringify({
      location: 'api/deepwiki.ts:extractMermaidDiagram:match3',
      message: 'Found direct mermaid content',
      data: { extractedLength: trimmed.length },
      timestamp: Date.now(),
      sessionId: 'debug-session',
      runId: 'run1',
      hypothesisId: 'E'
    }) + '\n';
    fs.appendFileSync(logPath, logEntry5);
    // #endregion
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
    // #region agent log
    const logEntry6 = JSON.stringify({
      location: 'api/deepwiki.ts:extractMermaidDiagram:match4',
      message: 'Found mermaid content in lines',
      data: { diagramLinesCount: diagramLines.length },
      timestamp: Date.now(),
      sessionId: 'debug-session',
      runId: 'run1',
      hypothesisId: 'E'
    }) + '\n';
    fs.appendFileSync(logPath, logEntry6);
    // #endregion
    return diagramLines.join('\n');
  }

  // #region agent log
  const logEntry7 = JSON.stringify({
    location: 'api/deepwiki.ts:extractMermaidDiagram:noMatch',
    message: 'No mermaid diagram found - all patterns failed',
    data: {
      responseLength: response.length,
      responsePreview: response.substring(0, 1000),
      hasMermaidBlock: response.includes('```mermaid'),
      hasGraphKeyword: /(graph|flowchart|sequenceDiagram|classDiagram|stateDiagram)/.test(response)
    },
    timestamp: Date.now(),
    sessionId: 'debug-session',
    runId: 'run1',
    hypothesisId: 'E'
  }) + '\n';
  fs.appendFileSync(logPath, logEntry7);
  // #endregion

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
 * @param repoUrl - The repository URL to analyze
 * @param drilldownNode - Optional: Name/label of the node to drill into (for drill-down mode)
 * @param previousDiagram - Optional: Previous Mermaid diagram for context (for drill-down mode)
 * @param nodePath - Optional: File path hint for the drilldown node
 */
export async function getMermaidDiagramFromDeepWiki(
  repoUrl: string,
  drilldownNode?: string | null,
  previousDiagram?: string | null,
  nodePath?: string | null
): Promise<string> {
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

      // Build the request with optional drilldown parameters
      const request: any = {
        repo_url: baseRepoUrl,
        type: 'github',
        messages: [
          {
            role: 'user',
            content: drilldownNode
              ? `The user clicked on "${drilldownNode}" and wants to see a DETAILED ZOOM-IN view. Show INTERNAL details of "${drilldownNode}" (its subcomponents, functions, modules), maintain context of how "${drilldownNode}" fits into the overall architecture, and focus primarily on "${drilldownNode}" but show how it connects to the rest. Return ONLY the mermaid code block.`
              : 'Analyze the codebase architecture and generate a comprehensive Mermaid.js diagram showing main components, relationships, architecture patterns, entry points, and external dependencies. Return ONLY the mermaid code block.'
          }
        ],
        provider: process.env.PROVIDER || 'openai',
        model: process.env.MODEL || 'gpt-4o',
        language: 'en'
      };

      // Add drilldown/expand parameters if provided
      // Note: Python backend uses 'expandNode' parameter for drilldown functionality
      if (drilldownNode) {
        request.expandNode = drilldownNode;
        // Enhanced query for better contextual embeddings in expand mode
        request.enhancedQuery = drilldownNode 
          ? `${drilldownNode} internal structure implementation${nodePath ? ` in ${nodePath} directory` : ''}`
          : undefined;
      }
      // Note: previousDiagram is not directly supported by Python backend WebSocket API
      // The backend uses expandNode + enhancedQuery for drilldown context

      console.log('🔍 [DEEPWIKI] Sending request:', JSON.stringify(request, null, 2));
      ws.send(JSON.stringify(request));
    });

    let responseText = '';

    ws.on('message', (data: WebSocket.Data) => {
      const message = data.toString();
      
      // #region agent log
      const logPath = '/Users/shreyaspatel/Desktop/Code/system-design/.cursor/debug.log';
      const logEntry = JSON.stringify({
        location: 'api/deepwiki.ts:195',
        message: 'DeepWiki WebSocket message received',
        data: {
          messageLength: message.length,
          messageFull: message, // Full message for debugging
          messagePreview: message.substring(0, 500),
          isMetrics: message.startsWith('[METRICS_START]'),
          isDone: message === '[DONE]',
          isError: message === '[ERROR]',
          looksLikeError: /^(Error|ERROR|Exception|Traceback|Failed)/i.test(message.trim()),
          accumulatedLengthBefore: responseText.length,
          accumulatedPreview: responseText.substring(0, 500)
        },
        timestamp: Date.now(),
        sessionId: 'debug-session',
        runId: 'run1',
        hypothesisId: 'A'
      }) + '\n';
      fs.appendFile(logPath, logEntry, () => {});
      // #endregion
      
      // Skip metrics messages
      if (message.startsWith('[METRICS_START]')) {
        // #region agent log
        const logEntry2 = JSON.stringify({
          location: 'api/deepwiki.ts:220',
          message: 'Skipping metrics message',
          data: { message: message.substring(0, 200) },
          timestamp: Date.now(),
          sessionId: 'debug-session',
          runId: 'run1',
          hypothesisId: 'A'
        }) + '\n';
        fs.appendFile(logPath, logEntry2, () => {});
        // #endregion
        return;
      }
      
      // Check if message looks like an error (starts with Error, Exception, etc.)
      // IMPORTANT: Only treat as error if it's NOT part of a Mermaid diagram
      // Check both the current message AND accumulated responseText to avoid false positives
      const messageTrimmed = message.trim();
      const accumulatedTrimmed = responseText.trim();
      
      // Check what the accumulated text would look like WITH this message
      const wouldBeAccumulated = (responseText + message).trim();
      
      const looksLikeError = /^(Error|ERROR|Exception|Traceback|Failed|\[Errno)/i.test(messageTrimmed);
      
      // Only treat as error if:
      // 1. Message starts with error pattern
      // 2. NOT part of Mermaid diagram (check both current accumulated AND what it would be with this message)
      // 3. The accumulated text (with this message) doesn't contain Mermaid diagram markers
      const isInMermaidContext = accumulatedTrimmed.includes('```mermaid') || 
                                  /(graph|flowchart|sequenceDiagram|classDiagram|stateDiagram)/i.test(accumulatedTrimmed) ||
                                  wouldBeAccumulated.includes('```mermaid') ||
                                  /(graph|flowchart|sequenceDiagram|classDiagram|stateDiagram)/i.test(wouldBeAccumulated) ||
                                  message.includes('```mermaid') ||
                                  /(graph|flowchart|sequenceDiagram|classDiagram|stateDiagram)/i.test(message);
      
      // Check if this is a standalone error message (not part of diagram content)
      // Error messages from backend are usually:
      // - Complete sentences/phrases (not just "Error" alone)
      // - Don't appear in the middle of a Mermaid diagram
      // - Are substantial (more than just a single word)
      const isStandaloneError = looksLikeError && 
                                 !isInMermaidContext && 
                                 // Only treat as error if message is substantial OR it's a complete error phrase
                                 (messageTrimmed.length > 20 || 
                                  messageTrimmed.match(/^(Error|ERROR|Exception|Traceback|Failed|\[Errno)[^a-zA-Z]/i) !== null ||
                                  /^(Error|ERROR|Exception|Traceback|Failed|\[Errno)\s+(preparing|during|in|with|occurred)/i.test(messageTrimmed));
      
      if (isStandaloneError) {
        // #region agent log
        const logEntryError = JSON.stringify({
          location: 'api/deepwiki.ts:235',
          message: 'Detected error message from backend',
          data: {
            errorMessage: message,
            messageLength: message.length,
            accumulatedLength: responseText.length,
            isInMermaidContext: false,
            messageTrimmed: messageTrimmed
          },
          timestamp: Date.now(),
          sessionId: 'debug-session',
          runId: 'run1',
          hypothesisId: 'C'
        }) + '\n';
        fs.appendFile(logPath, logEntryError, () => {});
        // #endregion
        
        clearTimeout(timeoutId);
        if (!isResolved) {
          isResolved = true;
          ws.close();
          
          // #region agent log
          const logEntry = JSON.stringify({
            location: 'api/deepwiki.ts:errorDetection',
            message: 'Rejecting with backend error',
            data: {
              errorMessage: message.trim(),
              messageLength: message.length,
              repoUrl: repoUrl
            },
            timestamp: Date.now(),
            sessionId: 'debug-session',
            runId: 'run1',
            hypothesisId: 'C'
          }) + '\n';
          fs.appendFileSync(logPath, logEntry);
          // #endregion
          
          reject(new Error(`Backend error: ${message.trim()}`));
        }
        return;
      }

      // Check for end markers
      if (message === '[DONE]') {
        // #region agent log
        const logEntry3 = JSON.stringify({
          location: 'api/deepwiki.ts:228',
          message: '[DONE] marker received',
          data: {
            responseTextLength: responseText.length,
            responseTextFull: responseText, // Full response for debugging
            responseTextPreview: responseText.substring(0, 1000),
            responseTextEnd: responseText.substring(Math.max(0, responseText.length - 500)),
            hasMermaidBlock: responseText.includes('```mermaid'),
            hasGraphKeyword: /(graph|flowchart|sequenceDiagram|classDiagram|stateDiagram)/.test(responseText),
            isResolved: isResolved
          },
          timestamp: Date.now(),
          sessionId: 'debug-session',
          runId: 'run1',
          hypothesisId: 'B'
        }) + '\n';
        fs.appendFile(logPath, logEntry3, () => {});
        // #endregion
        
        clearTimeout(timeoutId);
        // Process response before closing
        if (!isResolved && responseText) {
          // #region agent log
          const logEntry4 = JSON.stringify({
            location: 'api/deepwiki.ts:250',
            message: 'Attempting to extract Mermaid diagram',
            data: {
              responseTextLength: responseText.length,
              responseTextSample: responseText.substring(0, 500)
            },
            timestamp: Date.now(),
            sessionId: 'debug-session',
            runId: 'run1',
            hypothesisId: 'E'
          }) + '\n';
          fs.appendFile(logPath, logEntry4, () => {});
          // #endregion
          
          const diagram = extractMermaidDiagram(responseText);
          
          // #region agent log
          const logEntry5 = JSON.stringify({
            location: 'api/deepwiki.ts:262',
            message: 'Mermaid extraction result',
            data: {
              extracted: diagram !== null,
              diagramLength: diagram ? diagram.length : 0,
              diagramPreview: diagram ? diagram.substring(0, 200) : null
            },
            timestamp: Date.now(),
            sessionId: 'debug-session',
            runId: 'run1',
            hypothesisId: 'E'
          }) + '\n';
          fs.appendFile(logPath, logEntry5, () => {});
          // #endregion
          
          if (diagram) {
            isResolved = true;
            ws.close();
            resolve(diagram);
            return;
          } else {
            // #region agent log
            const logEntry6 = JSON.stringify({
              location: 'api/deepwiki.ts:280',
              message: 'Extraction failed - analyzing why',
              data: {
                responseText: responseText,
                responseLength: responseText.length,
                extractionAttempts: {
                  mermaidBlockMatch: responseText.match(/```mermaid[\s\S]*?```/) !== null,
                  mermaidBlockNoNewline: responseText.match(/```mermaid([\s\S]*?)```/) !== null,
                  startsWithGraph: /^(graph|flowchart|sequenceDiagram|classDiagram|stateDiagram)/.test(responseText.trim()),
                  hasGraphKeyword: /(graph|flowchart|sequenceDiagram|classDiagram|stateDiagram)/.test(responseText)
                }
              },
              timestamp: Date.now(),
              sessionId: 'debug-session',
              runId: 'run1',
              hypothesisId: 'E'
            }) + '\n';
            fs.appendFile(logPath, logEntry6, () => {});
            // #endregion
            isResolved = true;
            ws.close();
            reject(new Error('Failed to extract Mermaid diagram from response'));
            return;
          }
        } else if (!isResolved) {
          // #region agent log
          const logEntry7 = JSON.stringify({
            location: 'api/deepwiki.ts:305',
            message: '[DONE] received but responseText is empty',
            data: {
              responseTextLength: responseText.length,
              responseText: responseText,
              isResolved: isResolved
            },
            timestamp: Date.now(),
            sessionId: 'debug-session',
            runId: 'run1',
            hypothesisId: 'B'
          }) + '\n';
          fs.appendFile(logPath, logEntry7, () => {});
          // #endregion
          isResolved = true;
          ws.close();
          reject(new Error('Backend returned [DONE] but no response text was received'));
          return;
        }
      }

      if (message === '[ERROR]') {
        // #region agent log
        const logEntry8 = JSON.stringify({
          location: 'api/deepwiki.ts:323',
          message: '[ERROR] marker received',
          data: {
            responseTextLength: responseText.length,
            responseText: responseText.substring(0, 500)
          },
          timestamp: Date.now(),
          sessionId: 'debug-session',
          runId: 'run1',
          hypothesisId: 'C'
        }) + '\n';
        fs.appendFile(logPath, logEntry8, () => {});
        // #endregion
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
        const beforeLength = responseText.length;
        responseText += message;
        const afterLength = responseText.length;
        
        // #region agent log
        const logEntry9 = JSON.stringify({
          location: 'api/deepwiki.ts:347',
          message: 'Accumulating message into responseText',
          data: {
            messageLength: message.length,
            beforeLength: beforeLength,
            afterLength: afterLength,
            expectedLength: beforeLength + message.length,
            matches: afterLength === (beforeLength + message.length),
            accumulatedPreview: responseText.substring(0, 500)
          },
          timestamp: Date.now(),
          sessionId: 'debug-session',
          runId: 'run1',
          hypothesisId: 'A'
        }) + '\n';
        fs.appendFile(logPath, logEntry9, () => {});
        // #endregion
      }
    });

    ws.on('close', (code: number, reason: Buffer) => {
      clearTimeout(timeoutId);
      
      // #region agent log
      const logPath = '/Users/shreyaspatel/Desktop/Code/system-design/.cursor/debug.log';
      const logEntryClose = JSON.stringify({
        location: 'api/deepwiki.ts:close',
        message: 'WebSocket closed',
        data: {
          closeCode: code,
          closeReason: reason ? reason.toString() : null,
          isResolved: isResolved,
          responseTextLength: responseText.length,
          responseTextPreview: responseText.substring(0, 500)
        },
        timestamp: Date.now(),
        sessionId: 'debug-session',
        runId: 'run1',
        hypothesisId: 'D'
      }) + '\n';
      fs.appendFileSync(logPath, logEntryClose);
      // #endregion

      // Only process if not already resolved (handles case where connection closes without [DONE])
      if (!isResolved && responseText) {
        // Check if responseText looks like an error before trying to extract diagram
        const trimmedResponse = responseText.trim();
        const looksLikeError = /^(Error|ERROR|Exception|Traceback|Failed|\[Errno)/i.test(trimmedResponse);
        
        // #region agent log
        const logEntry = JSON.stringify({
          location: 'api/deepwiki.ts:380',
          message: 'Processing responseText on close (no [DONE] received)',
          data: {
            responseLength: responseText.length,
            responseFull: responseText, // Full response for debugging
            responsePreview: responseText.substring(0, 1000),
            responseEnd: responseText.substring(Math.max(0, responseText.length - 500)),
            hasMermaidBlock: responseText.includes('```mermaid'),
            hasGraphKeyword: /(graph|flowchart|sequenceDiagram|classDiagram|stateDiagram)/.test(responseText),
            looksLikeError: looksLikeError
          },
          timestamp: Date.now(),
          sessionId: 'debug-session',
          runId: 'run1',
          hypothesisId: 'D'
        }) + '\n';
        fs.appendFileSync(logPath, logEntry);
        // #endregion
        
        // If response looks like an error, reject immediately
        if (looksLikeError && !responseText.includes('```mermaid') && !/(graph|flowchart|sequenceDiagram|classDiagram|stateDiagram)/i.test(responseText)) {
          // #region agent log
          const logEntryError = JSON.stringify({
            location: 'api/deepwiki.ts:405',
            message: 'ResponseText is an error message, rejecting',
            data: {
              errorMessage: responseText,
              responseLength: responseText.length
            },
            timestamp: Date.now(),
            sessionId: 'debug-session',
            runId: 'run1',
            hypothesisId: 'C'
          }) + '\n';
          fs.appendFileSync(logPath, logEntryError);
          // #endregion
          isResolved = true;
          reject(new Error(`Backend error: ${trimmedResponse}`));
          return;
        }

        const diagram = extractMermaidDiagram(responseText);
        if (diagram) {
          // #region agent log
          const logEntry2 = JSON.stringify({
            location: 'api/deepwiki.ts:402',
            message: 'Mermaid diagram extracted successfully from close handler',
            data: {
              diagramLength: diagram.length,
              diagramPreview: diagram.substring(0, 200)
            },
            timestamp: Date.now(),
            sessionId: 'debug-session',
            runId: 'run1',
            hypothesisId: 'D'
          }) + '\n';
          fs.appendFileSync(logPath, logEntry2);
          // #endregion
          isResolved = true;
          resolve(diagram);
        } else {
          // #region agent log
          const logEntry3 = JSON.stringify({
            location: 'api/deepwiki.ts:416',
            message: 'Failed to extract Mermaid diagram from close handler',
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
            hypothesisId: 'D'
          }) + '\n';
          fs.appendFileSync(logPath, logEntry3);
          // #endregion
          isResolved = true;
          reject(new Error('Failed to extract Mermaid diagram from response'));
        }
      } else if (!isResolved) {
        // #region agent log
        const logEntry4 = JSON.stringify({
          location: 'api/deepwiki.ts:437',
          message: 'WebSocket closed but no responseText received',
          data: {
            responseTextEmpty: true,
            responseTextLength: responseText.length,
            isResolved: isResolved,
            closeCode: code
          },
          timestamp: Date.now(),
          sessionId: 'debug-session',
          runId: 'run1',
          hypothesisId: 'D'
        }) + '\n';
        fs.appendFileSync(logPath, logEntry4);
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



