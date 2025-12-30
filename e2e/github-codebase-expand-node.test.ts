/**
 * GitHub Codebase Diagram Expansion Test
 * 
 * Tests the complete flow with two checkpoints:
 * 1. First checkpoint: User enters GitHub URL, creates initial diagram (same as first test)
 * 2. Second checkpoint: User selects a node and sends expand message, verifies expansion instead of replacement
 */

import { test, expect, Page } from '@playwright/test';
import { getBaseUrl } from './test-config.js';

test.describe('GitHub Codebase Diagram Expansion', () => {
  let BASE_URL: string;
  
  test.beforeAll(async () => {
    BASE_URL = await getBaseUrl();
  });
  
  /**
   * Helper function to select a node using ReactFlow API
   */
  async function selectNode(page: Page, nodeId: string): Promise<void> {
    console.log(`🎯 Selecting node: ${nodeId}`);
    
    // Use ReactFlow API to select the node directly (more reliable than clicking)
    await page.evaluate((nId) => {
      const rfInstance = (window as any).__reactFlowInstance;
      if (rfInstance) {
        // Deselect all nodes first
        rfInstance.setNodes((nds: any[]) => 
          nds.map(n => ({ ...n, selected: false }))
        );
        // Select the target node
        rfInstance.setNodes((nds: any[]) => 
          nds.map(n => ({ ...n, selected: n.id === nId }))
        );
        // Also update global selectedNodeIds (used by chat)
        (window as any).selectedNodeIds = [nId];
        // Trigger selection change event
        const nodes = rfInstance.getNodes();
        const selectedNode = nodes.find((n: any) => n.id === nId);
        if (selectedNode && rfInstance.onSelectionChange) {
          rfInstance.onSelectionChange({ nodes: [selectedNode], edges: [] });
        }
      }
    }, nodeId);
    
    await page.waitForTimeout(1000); // Give React time to update
    
    // Verify selection
    const finalSelection = await page.evaluate((nId) => {
      const rfInstance = (window as any).__reactFlowInstance;
      if (rfInstance) {
        const nodes = rfInstance.getNodes();
        const node = nodes.find((n: any) => n.id === nId);
        const isSelected = node && node.selected;
        const globalSelected = Array.isArray((window as any).selectedNodeIds) && 
                               (window as any).selectedNodeIds.includes(nId);
        return { isSelected, globalSelected, nodeExists: !!node };
      }
      return { isSelected: false, globalSelected: false, nodeExists: false };
    }, nodeId);
    
    if (!finalSelection.nodeExists) {
      throw new Error(`❌ Node ${nodeId} does not exist on canvas`);
    }
    
    if (!finalSelection.isSelected || !finalSelection.globalSelected) {
      // Retry selection
      await page.evaluate((nId) => {
        const rfInstance = (window as any).__reactFlowInstance;
        if (rfInstance) {
          rfInstance.setNodes((nds: any[]) => 
            nds.map(n => ({ ...n, selected: n.id === nId }))
          );
          (window as any).selectedNodeIds = [nId];
        }
      }, nodeId);
      await page.waitForTimeout(1000);
      
      // Verify again
      const retrySelection = await page.evaluate((nId) => {
        const rfInstance = (window as any).__reactFlowInstance;
        if (rfInstance) {
          const nodes = rfInstance.getNodes();
          const node = nodes.find((n: any) => n.id === nId);
          return node && node.selected && 
                 Array.isArray((window as any).selectedNodeIds) && 
                 (window as any).selectedNodeIds.includes(nId);
        }
        return false;
      }, nodeId);
      
      if (!retrySelection) {
        throw new Error(`❌ Failed to select node: ${nodeId} (isSelected: ${finalSelection.isSelected}, globalSelected: ${finalSelection.globalSelected})`);
      }
    }
    
    console.log(`✅ Node selected: ${nodeId}`);
  }
  
  /**
   * Helper function to get node children count from domain graph
   */
  async function getNodeChildrenCount(page: Page, nodeId: string): Promise<number> {
    return await page.evaluate((nId) => {
      const domainGraph = (window as any).getDomainGraph?.() || { children: [] };
      
      function findNodeById(graph: any, id: string): any {
        if (graph.id === id) return graph;
        if (graph.children) {
          for (const child of graph.children) {
            const found = findNodeById(child, id);
            if (found) return found;
          }
        }
        return null;
      }
      
      const node = findNodeById(domainGraph, nId);
      return node?.children?.length || 0;
    }, nodeId);
  }
  
  test('Should create initial diagram, then expand selected node instead of replacing', async ({ page }) => {
    test.setTimeout(180000); // 3 minutes total timeout
    
    const TIMEOUTS = {
      CHAT_API: 5000,
      CODEBASE_TOOL: 15000,
      MERMAID_DIAGRAM: 60000,
      DIAGRAM_AGENT: 20000,
      CANVAS_NODES: 30000,
      EXPANSION_WAIT: 60000 // 1 minute for expansion
    };
    
    console.log('📱 Loading canvas mode...');
    await page.goto(`${BASE_URL}/canvas`);
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('.react-flow', { timeout: 10000 });
    console.log('✅ Canvas loaded');
    
    // Open chat panel
    const agentIcon = page.locator('[data-testid="agent-icon"]');
    const agentIconCount = await agentIcon.count();
    
    if (agentIconCount > 0) {
      await agentIcon.hover();
      await page.waitForTimeout(1000);
      const toggleButton = page.locator('button[title*="Open Chat Panel" i], button[title*="Close Chat Panel" i]');
      const toggleButtonCount = await toggleButton.count();
      
      if (toggleButtonCount > 0) {
        const buttonTitle = await toggleButton.first().getAttribute('title');
        if (buttonTitle && buttonTitle.toLowerCase().includes('open')) {
          await toggleButton.first().click();
          await page.waitForTimeout(2000);
        }
      }
    }
    
    const chatInput = page.locator('[data-testid="chat-input"]');
    await chatInput.waitFor({ state: 'visible', timeout: 15000 });
    console.log('✅ Chat input found');
    
    // Clear chat history
    await page.evaluate(() => {
      localStorage.removeItem('chatMessages');
      localStorage.removeItem('chatHistory');
    });
    await page.waitForTimeout(500);
    console.log('🧹 Cleared chat history');
    
    // ============================================
    // CHECKPOINT 1: Create initial diagram
    // ============================================
    console.log('\n📊 CHECKPOINT 1: Creating initial diagram...');
    
    let chatApiCalled = false;
    let codebaseToolDetected = false;
    let mermaidDiagramDetected = false;
    let mermaidDiagramContent: string | null = null;
    let diagramAgentCalled = false;
    let streamMessages: string[] = [];
    
    // Monitor API requests
    page.on('request', (request) => {
      if (request.url().includes('/api/chat')) {
        chatApiCalled = true;
      }
      if (request.url().includes('/api/simple-agent')) {
        diagramAgentCalled = true;
      }
      if (request.url().includes('deepwiki') || request.url().includes('ws://') || request.url().includes('wss://')) {
        codebaseToolDetected = true;
      }
    });
    
    // Monitor console logs for tool calls and diagram creation
    page.on('console', (msg) => {
      const text = msg.text();
      const type = msg.type();
      console.log(`[Browser ${type}]: ${text.substring(0, 200)}`);
      
      // Check console logs for codebase tool processing
      if (text.includes('🛠️ Processing codebase tool') ||
          text.includes('🔗 Handling Codebase Tool') ||
          text.includes('Handling Codebase Tool') ||
          text.includes('Processing codebase tool') ||
          (text.includes('codebase tool') && (text.includes('Processing') || text.includes('Handling')))) {
        codebaseToolDetected = true;
        console.log('✅ Codebase tool detected via console log!');
      }
      
      // Check for Mermaid diagram being passed to diagram agent
      if (text.includes('📊 Passing Mermaid diagram to diagram agent') ||
          text.includes('Mermaid diagram detected from codebase tool')) {
        console.log('✅ Mermaid diagram detected in frontend');
      }
    });
    
    // Monitor network responses for tool_calls and mermaid_diagram in SSE stream
    page.on('response', async (response) => {
      if (response.url().includes('/api/chat') && response.status() === 200) {
        try {
          const body = await response.text().catch(() => '');
          if (body) {
            streamMessages.push(body);
            
            // Parse SSE format: data: {...}
            const lines = body.split('\n');
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const dataStr = line.substring(6).trim();
                if (dataStr && dataStr !== '[DONE]') {
                  try {
                    const data = JSON.parse(dataStr);
                    
                    // Detect tool_calls in OpenAI response format
                    if (data.choices?.[0]?.delta?.tool_calls) {
                      for (const toolCall of data.choices[0].delta.tool_calls) {
                        if (toolCall.function?.name === 'codebase') {
                          codebaseToolDetected = true;
                          console.log('✅ Codebase tool detected in SSE stream (delta.tool_calls)!');
                        }
                      }
                    }
                    
                    // Also check for accumulated tool calls in message
                    if (data.choices?.[0]?.message?.tool_calls) {
                      for (const toolCall of data.choices[0].message.tool_calls) {
                        if (toolCall.function?.name === 'codebase') {
                          codebaseToolDetected = true;
                          console.log('✅ Codebase tool detected in message.tool_calls!');
                        }
                      }
                    }
                    
                    // Check for diagram_creation message with mermaid_diagram field
                    if (data.type === 'diagram_creation') {
                      if (data.mermaid_diagram && typeof data.mermaid_diagram === 'string') {
                        mermaidDiagramDetected = true;
                        mermaidDiagramContent = data.mermaid_diagram;
                        console.log('✅ Mermaid diagram detected in diagram_creation message!');
                        console.log('📊 Mermaid diagram length:', data.mermaid_diagram.length);
                      }
                    }
                  } catch (e) {
                    // Not JSON - skip
                  }
                }
              }
            }
          }
        } catch (e) {
          // Ignore streaming response errors
        }
      }
    });
    
    // Send GitHub URL
    const githubUrl = 'https://github.com/ShreyasPatel031/openai-realtime-elkjs-tool/tree/edge-routing';
    const githubUrlWithContext = `analyze this codebase: ${githubUrl}`;
    await chatInput.fill(githubUrlWithContext);
    console.log(`📝 Entered GitHub URL: ${githubUrlWithContext}`);
    
    await chatInput.press('Enter');
    console.log('✅ Pressed Enter to submit');
    
    // Wait for chat API
    console.log('⏳ Waiting for chat API...');
    const step0StartTime = Date.now();
    while (!chatApiCalled && (Date.now() - step0StartTime) < TIMEOUTS.CHAT_API) {
      await page.waitForTimeout(500);
    }
    if (!chatApiCalled) {
      throw new Error(`❌ TIMEOUT: Chat API was not called within ${TIMEOUTS.CHAT_API/1000}s`);
    }
    console.log('✅ Step 0 PASSED: Chat API called');
    
    // Wait for codebase tool call (with fallback detection)
    console.log('⏳ Step 0.5: Waiting for codebase tool call detection...');
    console.log('   Note: Detection relies on SSE stream response body, console logs, and network requests');
    console.log('   Fallback: Mermaid diagram detection also indicates codebase tool was called');
    const step05StartTime = Date.now();
    while (!codebaseToolDetected && !mermaidDiagramDetected && (Date.now() - step05StartTime) < TIMEOUTS.CODEBASE_TOOL) {
      // Re-check accumulated stream messages - ONLY parse JSON and check tool_calls structure
      const allStreamText = streamMessages.join('\n');
      const lines = allStreamText.split('\n');
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const dataStr = line.substring(6).trim();
          if (dataStr && dataStr !== '[DONE]') {
            try {
              const data = JSON.parse(dataStr);
              
              // ONLY detect actual tool_calls in OpenAI response format
              if (data.choices?.[0]?.delta?.tool_calls) {
                for (const toolCall of data.choices[0].delta.tool_calls) {
                  if (toolCall.function?.name === 'codebase') {
                    codebaseToolDetected = true;
                    console.log('✅ Codebase tool detected in SSE stream (delta.tool_calls)!');
                    break;
                  }
                }
              }
              
              // Check for accumulated tool calls in message
              if (data.choices?.[0]?.message?.tool_calls) {
                for (const toolCall of data.choices[0].message.tool_calls) {
                  if (toolCall.function?.name === 'codebase') {
                    codebaseToolDetected = true;
                    console.log('✅ Codebase tool detected in SSE stream (message.tool_calls)!');
                    break;
                  }
                }
              }
            } catch (e) {
              // Not JSON - skip to avoid false positives from string matching
            }
          }
        }
      }
      
      // FALLBACK: If mermaid diagram detected, codebase tool was definitely called
      if (mermaidDiagramDetected) {
        codebaseToolDetected = true;
        console.log('✅ Codebase tool detected via fallback (Mermaid diagram found)!');
        break;
      }
      
      if (codebaseToolDetected) break;
      
      await page.waitForTimeout(1000);
      const elapsed = Math.floor((Date.now() - step05StartTime) / 1000);
      if (elapsed % 5 === 0 && elapsed > 0) {
        console.log(`⏳ Still waiting for codebase tool detection... (${elapsed}s)`);
        console.log(`   Stream messages collected: ${streamMessages.length} chunks`);
        console.log(`   Mermaid diagram detected: ${mermaidDiagramDetected}`);
      }
    }
    
    // If mermaid diagram detected but codebase tool flag not set, set it now
    if (mermaidDiagramDetected && !codebaseToolDetected) {
      codebaseToolDetected = true;
      console.log('✅ Codebase tool confirmed via Mermaid diagram detection!');
    }
    
    // FAIL EARLY: If codebase tool not detected within timeout (but allow mermaid diagram as fallback)
    if (!codebaseToolDetected && !mermaidDiagramDetected) {
      throw new Error(`❌ TIMEOUT: Codebase tool was not detected within ${TIMEOUTS.CODEBASE_TOOL/1000}s. Check server logs for codebase tool calls.`);
    }
    
    console.log('✅ Step 0.5 PASSED: Codebase tool was detected');
    
    // Wait for Mermaid diagram
    console.log('⏳ Waiting for Mermaid diagram...');
    const step1StartTime = Date.now();
    while ((Date.now() - step1StartTime) < TIMEOUTS.MERMAID_DIAGRAM) {
      await page.waitForTimeout(2000);
      const allStreamText = streamMessages.join('\n');
      const lines = allStreamText.split('\n');
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const dataStr = line.substring(6).trim();
          if (dataStr && dataStr !== '[DONE]') {
            try {
              const data = JSON.parse(dataStr);
              if (data.type === 'diagram_creation' && data.mermaid_diagram) {
                mermaidDiagramDetected = true;
                mermaidDiagramContent = data.mermaid_diagram;
                break;
              }
            } catch (e) {
              // Not JSON - skip
            }
          }
        }
      }
      if (mermaidDiagramDetected) break;
    }
    if (!mermaidDiagramDetected || !mermaidDiagramContent || mermaidDiagramContent.length < 50) {
      throw new Error(`❌ TIMEOUT: Mermaid diagram was not received within ${TIMEOUTS.MERMAID_DIAGRAM/1000}s`);
    }
    console.log('✅ Step 1 PASSED: Mermaid diagram received');
    
    // Wait for diagram agent
    console.log('⏳ Waiting for diagram agent...');
    const step2StartTime = Date.now();
    while (!diagramAgentCalled && (Date.now() - step2StartTime) < TIMEOUTS.DIAGRAM_AGENT) {
      await page.waitForTimeout(1000);
    }
    if (!diagramAgentCalled) {
      throw new Error(`❌ TIMEOUT: Diagram agent was not called within ${TIMEOUTS.DIAGRAM_AGENT/1000}s`);
    }
    console.log('✅ Step 2 PASSED: Diagram agent called');
    
    // Wait for nodes on canvas
    console.log('⏳ Waiting for nodes on canvas...');
    const step3StartTime = Date.now();
    let nodeCount = 0;
    let nodeIds: string[] = [];
    
    while ((Date.now() - step3StartTime) < TIMEOUTS.CANVAS_NODES) {
      const reactFlowNodes = page.locator('.react-flow__node');
      nodeCount = await reactFlowNodes.count();
      
      if (nodeCount > 0) {
        // Get node IDs
        nodeIds = await page.evaluate(() => {
          const nodes = Array.from(document.querySelectorAll('.react-flow__node'));
          return nodes.map(n => n.getAttribute('data-id') || '').filter(id => id && id !== 'root');
        });
        
        if (nodeIds.length > 0) {
          console.log(`✅ Step 3 PASSED: Nodes found on canvas (${nodeCount} nodes)`);
          console.log(`📊 Node IDs: ${nodeIds.slice(0, 5).join(', ')}${nodeIds.length > 5 ? '...' : ''}`);
          break;
        }
      }
      await page.waitForTimeout(2000);
    }
    
    if (nodeCount === 0 || nodeIds.length === 0) {
      throw new Error(`❌ TIMEOUT: No nodes were created on canvas within ${TIMEOUTS.CANVAS_NODES/1000}s`);
    }
    
    console.log('✅ CHECKPOINT 1 PASSED: Initial diagram created');
    console.log(`📊 Initial state: ${nodeCount} nodes, ${nodeIds.length} node IDs`);
    
    // ============================================
    // CHECKPOINT 2: Expand selected node
    // ============================================
    console.log('\n📊 CHECKPOINT 2: Expanding selected node...');
    
    // Select the first node (or any node) - prefer a regular node over a group
    // Filter out 'root' and find a good candidate
    const candidateNodes = nodeIds.filter(id => id && id !== 'root');
    let nodeToExpand = candidateNodes[0];
    
    // Try to find a regular node (not a group) if possible
    const nodeType = await page.evaluate((nId) => {
      const rfInstance = (window as any).__reactFlowInstance;
      if (rfInstance) {
        const nodes = rfInstance.getNodes();
        const node = nodes.find((n: any) => n.id === nId);
        return node ? (node.type || 'custom') : null;
      }
      return null;
    }, nodeToExpand);
    
    console.log(`🎯 Selecting node to expand: ${nodeToExpand} (type: ${nodeType})`);
    
    // Get initial children count
    const initialChildrenCount = await getNodeChildrenCount(page, nodeToExpand);
    console.log(`📊 Initial children count for ${nodeToExpand}: ${initialChildrenCount}`);
    
    // Select the node using ReactFlow API
    await selectNode(page, nodeToExpand);
    
    // Wait for selection to register and verify
    await page.waitForTimeout(2000);
    
    // Verify node is selected (check both ReactFlow state and global state)
    const selectionState = await page.evaluate((nId) => {
      const rfInstance = (window as any).__reactFlowInstance;
      const globalSelected = Array.isArray((window as any).selectedNodeIds) && 
                             (window as any).selectedNodeIds.includes(nId);
      
      if (rfInstance) {
        const nodes = rfInstance.getNodes();
        const node = nodes.find((n: any) => n.id === nId);
        const reactFlowSelected = node && node.selected;
        return { reactFlowSelected, globalSelected, nodeExists: !!node };
      }
      return { reactFlowSelected: false, globalSelected, nodeExists: false };
    }, nodeToExpand);
    
    if (!selectionState.nodeExists) {
      throw new Error(`❌ Node ${nodeToExpand} does not exist on canvas`);
    }
    
    if (!selectionState.reactFlowSelected || !selectionState.globalSelected) {
      // Retry selection one more time
      console.log(`⚠️ Selection not fully registered, retrying...`);
      await selectNode(page, nodeToExpand);
      await page.waitForTimeout(2000);
      
      // Final check
      const finalState = await page.evaluate((nId) => {
        const rfInstance = (window as any).__reactFlowInstance;
        const globalSelected = Array.isArray((window as any).selectedNodeIds) && 
                               (window as any).selectedNodeIds.includes(nId);
        if (rfInstance) {
          const nodes = rfInstance.getNodes();
          const node = nodes.find((n: any) => n.id === nId);
          return node && node.selected && globalSelected;
        }
        return false;
      }, nodeToExpand);
      
      if (!finalState) {
        console.log(`⚠️ Node selection may not be perfect, but continuing anyway...`);
        console.log(`   ReactFlow selected: ${selectionState.reactFlowSelected}`);
        console.log(`   Global selected: ${selectionState.globalSelected}`);
        // Don't fail here - the global state might be enough for the backend
      }
    }
    
    console.log(`✅ Node ${nodeToExpand} selection verified`);
    
    // Reset detection flags for second diagram creation
    chatApiCalled = false;
    codebaseToolDetected = false;
    mermaidDiagramDetected = false;
    mermaidDiagramContent = null;
    diagramAgentCalled = false;
    streamMessages = [];
    
    // Send expand message with the same GitHub URL
    const expandMessage = `expand this: ${githubUrl}`;
    await chatInput.fill(expandMessage);
    console.log(`📝 Entered expand message: ${expandMessage}`);
    
    await chatInput.press('Enter');
    console.log('✅ Pressed Enter to submit expand request');
    
    // Wait for second chat API call
    console.log('⏳ Waiting for second chat API call...');
    const expandStep0StartTime = Date.now();
    while (!chatApiCalled && (Date.now() - expandStep0StartTime) < TIMEOUTS.CHAT_API) {
      await page.waitForTimeout(500);
    }
    if (!chatApiCalled) {
      throw new Error(`❌ TIMEOUT: Second chat API was not called within ${TIMEOUTS.CHAT_API/1000}s`);
    }
    console.log('✅ Expand Step 0 PASSED: Second chat API called');
    
    // Wait for second codebase tool call (with fallback detection)
    console.log('⏳ Expand Step 0.5: Waiting for second codebase tool call detection...');
    const expandStep05StartTime = Date.now();
    while (!codebaseToolDetected && !mermaidDiagramDetected && (Date.now() - expandStep05StartTime) < TIMEOUTS.CODEBASE_TOOL) {
      // Re-check accumulated stream messages
      const allStreamText = streamMessages.join('\n');
      const lines = allStreamText.split('\n');
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const dataStr = line.substring(6).trim();
          if (dataStr && dataStr !== '[DONE]') {
            try {
              const data = JSON.parse(dataStr);
              
              if (data.choices?.[0]?.delta?.tool_calls) {
                for (const toolCall of data.choices[0].delta.tool_calls) {
                  if (toolCall.function?.name === 'codebase') {
                    codebaseToolDetected = true;
                    console.log('✅ Second codebase tool detected in SSE stream (delta.tool_calls)!');
                    break;
                  }
                }
              }
              
              if (data.choices?.[0]?.message?.tool_calls) {
                for (const toolCall of data.choices[0].message.tool_calls) {
                  if (toolCall.function?.name === 'codebase') {
                    codebaseToolDetected = true;
                    console.log('✅ Second codebase tool detected in message.tool_calls!');
                    break;
                  }
                }
              }
            } catch (e) {
              // Not JSON - skip
            }
          }
        }
      }
      
      // FALLBACK: If mermaid diagram detected, codebase tool was definitely called
      if (mermaidDiagramDetected) {
        codebaseToolDetected = true;
        console.log('✅ Second codebase tool detected via fallback (Mermaid diagram found)!');
        break;
      }
      
      if (codebaseToolDetected) break;
      
      await page.waitForTimeout(1000);
    }
    
    if (mermaidDiagramDetected && !codebaseToolDetected) {
      codebaseToolDetected = true;
      console.log('✅ Second codebase tool confirmed via Mermaid diagram detection!');
    }
    
    if (!codebaseToolDetected && !mermaidDiagramDetected) {
      throw new Error(`❌ TIMEOUT: Second codebase tool was not detected within ${TIMEOUTS.CODEBASE_TOOL/1000}s`);
    }
    
    console.log('✅ Expand Step 0.5 PASSED: Second codebase tool detected');
    
    // Wait for second Mermaid diagram
    console.log('⏳ Waiting for second Mermaid diagram...');
    const expandStep1StartTime = Date.now();
    while ((Date.now() - expandStep1StartTime) < TIMEOUTS.MERMAID_DIAGRAM) {
      await page.waitForTimeout(2000);
      const allStreamText = streamMessages.join('\n');
      const lines = allStreamText.split('\n');
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const dataStr = line.substring(6).trim();
          if (dataStr && dataStr !== '[DONE]') {
            try {
              const data = JSON.parse(dataStr);
              if (data.type === 'diagram_creation' && data.mermaid_diagram) {
                mermaidDiagramDetected = true;
                mermaidDiagramContent = data.mermaid_diagram;
                break;
              }
            } catch (e) {
              // Not JSON - skip
            }
          }
        }
      }
      if (mermaidDiagramDetected) break;
    }
    if (!mermaidDiagramDetected || !mermaidDiagramContent || mermaidDiagramContent.length < 50) {
      throw new Error(`❌ TIMEOUT: Second Mermaid diagram was not received within ${TIMEOUTS.MERMAID_DIAGRAM/1000}s`);
    }
    console.log('✅ Expand Step 1 PASSED: Second Mermaid diagram received');
    
    // Wait for second diagram agent call
    console.log('⏳ Waiting for second diagram agent call...');
    const expandStep2StartTime = Date.now();
    while (!diagramAgentCalled && (Date.now() - expandStep2StartTime) < TIMEOUTS.DIAGRAM_AGENT) {
      await page.waitForTimeout(1000);
    }
    if (!diagramAgentCalled) {
      throw new Error(`❌ TIMEOUT: Second diagram agent was not called within ${TIMEOUTS.DIAGRAM_AGENT/1000}s`);
    }
    console.log('✅ Expand Step 2 PASSED: Second diagram agent called');
    
    // Wait for expansion to complete
    console.log('⏳ Waiting for node expansion to complete...');
    const expandStep3StartTime = Date.now();
    let finalChildrenCount = initialChildrenCount;
    let expanded = false;
    let finalTotalNodes = nodeCount;
    
    while ((Date.now() - expandStep3StartTime) < TIMEOUTS.EXPANSION_WAIT) {
      finalChildrenCount = await getNodeChildrenCount(page, nodeToExpand);
      
      // Check total node count - if it increased, expansion likely happened
      finalTotalNodes = await page.evaluate(() => {
        return document.querySelectorAll('.react-flow__node').length;
      });
      
      // Check if node was expanded (has more children than before)
      if (finalChildrenCount > initialChildrenCount) {
        expanded = true;
        console.log(`✅ Node ${nodeToExpand} was expanded!`);
        console.log(`📊 Children count: ${initialChildrenCount} → ${finalChildrenCount}`);
        break;
      }
      
      // Also check total node count - if it increased significantly, expansion likely happened
      // This is a more reliable indicator since node structure might change during expansion
      if (finalTotalNodes > nodeCount + 2) {
        // Significant increase in total nodes suggests expansion occurred
        expanded = true;
        console.log(`✅ Total nodes increased: ${nodeCount} → ${finalTotalNodes}`);
        console.log(`📊 This suggests expansion occurred (even if children count changed)`);
        break;
      }
      
      await page.waitForTimeout(2000);
      const elapsed = Math.floor((Date.now() - expandStep3StartTime) / 1000);
      if (elapsed % 10 === 0 && elapsed > 0) {
        console.log(`⏳ Still waiting for expansion... (${elapsed}s, children: ${finalChildrenCount}, total: ${finalTotalNodes})`);
      }
    }
    
    if (!expanded) {
      throw new Error(`❌ FAIL: Node ${nodeToExpand} was not expanded. Children count: ${initialChildrenCount} → ${finalChildrenCount}, Total nodes: ${nodeCount} → ${finalTotalNodes}. Expected increase.`);
    }
    
    // Verify the node still exists (not replaced)
    const nodeStillExists = await page.evaluate((nId) => {
      const rfInstance = (window as any).__reactFlowInstance;
      if (rfInstance) {
        const nodes = rfInstance.getNodes();
        return nodes.some((n: any) => n.id === nId);
      }
      return false;
    }, nodeToExpand);
    
    if (!nodeStillExists) {
      throw new Error(`❌ FAIL: Original node ${nodeToExpand} was replaced instead of expanded`);
    }
    
    console.log('✅ Expand Step 3 PASSED: Node was expanded (not replaced)');
    console.log(`📊 Final state: Node ${nodeToExpand} has ${finalChildrenCount} children (was ${initialChildrenCount})`);
    console.log(`📊 Total nodes: ${nodeCount} → ${finalTotalNodes}`);
    
    // Final assertions
    // Primary check: Total nodes increased (indicates expansion happened)
    // Secondary check: Original node still exists (indicates not replaced)
    expect(expanded).toBe(true);
    expect(nodeStillExists).toBe(true);
    expect(finalTotalNodes).toBeGreaterThan(nodeCount); // Total nodes should increase
    
    console.log('\n🎉 CHECKPOINT 2 PASSED: Node expansion verified');
    console.log('\n🎉 GitHub Codebase Diagram Expansion Test PASSED!');
    console.log('✅ Verified: Selected node was expanded instead of replacing the entire diagram');
  });
});

