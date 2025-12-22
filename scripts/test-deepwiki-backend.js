#!/usr/bin/env node

/**
 * Minimal test script for DeepWiki Python backend
 * Tests: GitHub URL -> Mermaid diagram
 * 
 * Usage: node scripts/test-deepwiki-backend.js <github-url>
 * Example: node scripts/test-deepwiki-backend.js https://github.com/ShreyasPatel031/openai-realtime-elkjs-tool.git
 */

import WebSocket from 'ws';

const PYTHON_WS_URL = process.env.PYTHON_WS_URL || 'ws://localhost:8001/ws/chat';
const REQUEST_TIMEOUT = 180000; // 3 minutes

/**
 * Extract Mermaid diagram from response text
 */
function extractMermaidDiagram(response) {
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
  const diagramLines = [];
  
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
 * Test DeepWiki backend by sending GitHub URL and receiving Mermaid diagram
 */
async function testDeepWikiBackend(repoUrl) {
  console.log(`🔗 Testing DeepWiki backend with URL: ${repoUrl}`);
  console.log(`📡 Connecting to: ${PYTHON_WS_URL}\n`);

  return new Promise((resolve, reject) => {
    const ws = new WebSocket(PYTHON_WS_URL);

    const timeoutId = setTimeout(() => {
      ws.close();
      reject(new Error('WebSocket timeout after 180 seconds'));
    }, REQUEST_TIMEOUT);

    ws.on('open', () => {
      console.log('✅ WebSocket connected\n');

      // Build request - ask for Mermaid architecture diagram
      const request = {
        repo_url: repoUrl,
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

      console.log('📤 Sending request...');
      ws.send(JSON.stringify(request));
    });

    let responseText = '';

    ws.on('message', (data) => {
      const message = data.toString();
      
      // Skip metrics messages
      if (message.startsWith('[METRICS_START]')) {
        return;
      }

      // Check for end markers
      if (message === '[DONE]') {
        clearTimeout(timeoutId);
        ws.close();
        return;
      }

      if (message === '[ERROR]') {
        clearTimeout(timeoutId);
        ws.close();
        reject(new Error('Backend returned [ERROR]'));
        return;
      }

      // Accumulate response
      responseText += message;
      process.stdout.write('.'); // Progress indicator
    });

    ws.on('close', () => {
      clearTimeout(timeoutId);
      console.log('\n\n📥 Response received\n');

      if (responseText) {
        const diagram = extractMermaidDiagram(responseText);
        if (diagram) {
          console.log('✅ Mermaid diagram extracted:\n');
          console.log('```mermaid');
          console.log(diagram);
          console.log('```\n');
          resolve(diagram);
        } else {
          console.log('⚠️  Could not extract Mermaid diagram from response');
          console.log('📄 Full response (first 500 chars):');
          console.log(responseText.substring(0, 500));
          reject(new Error('Failed to extract Mermaid diagram from response'));
        }
      } else {
        reject(new Error('No response received from Python backend'));
      }
    });

    ws.on('error', (error) => {
      clearTimeout(timeoutId);
      const errorMsg = error.message || error.toString() || 'Unknown error';
      reject(new Error(`WebSocket error: ${errorMsg}. Make sure the Python backend is running at ${PYTHON_WS_URL}`));
    });
  });
}

// Main execution
const repoUrl = process.argv[2];

if (!repoUrl) {
  console.error('❌ Usage: node scripts/test-deepwiki-backend.js <github-url>');
  console.error('   Example: node scripts/test-deepwiki-backend.js https://github.com/owner/repo.git');
  process.exit(1);
}

testDeepWikiBackend(repoUrl)
  .then((diagram) => {
    console.log('✅ Test completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  });
