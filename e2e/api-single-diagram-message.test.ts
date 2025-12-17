/**
 * API Single Diagram Message Test
 * 
 * Directly tests the API to verify only ONE "Creating architecture diagram" 
 * message is sent when the agent decides to create a diagram.
 * 
 * This test verifies the fix for multiple diagram creation messages at the API level.
 */

import { test, expect } from '@playwright/test';
import { getBaseUrl } from './test-config.js';

test.describe('API Single Diagram Message', () => {
  let BASE_URL: string;
  
  test.beforeAll(async () => {
    BASE_URL = await getBaseUrl();
  });
  
  test('API should send only ONE diagram creation message', async ({ request }) => {
    test.setTimeout(60000);
    
    console.log('📡 Testing API for single diagram creation message...');
    
    // First, send a question to get the agent to ask
    const questionResponse = await request.post(`${BASE_URL}/api/chat`, {
      data: {
        messages: [{ role: 'user', content: 'make llm assessor' }],
        currentGraph: { id: 'root', children: [], edges: [] },
        selectedNodeIds: [],
        selectedEdgeIds: [],
        images: []
      }
    });
    
    expect(questionResponse.ok()).toBeTruthy();
    console.log('✅ First API call successful');
    
    // Read response and extract question
    const questionBody = await questionResponse.text();
    const questionLines = questionBody.split('\n').filter(line => line.startsWith('data: '));
    
    let questionData: any = null;
    for (const line of questionLines) {
      try {
        const data = JSON.parse(line.substring(6));
        if (data.type === 'question') {
          questionData = data;
          break;
        }
      } catch (e) {
        // Not JSON, skip
      }
    }
    
    if (!questionData) {
      console.log('⚠️ No question received, checking if diagram was created directly...');
      // Check for diagram creation messages
      const diagramMatches = questionBody.match(/Creating.*architecture.*diagram/gi);
      if (diagramMatches) {
        console.log(`📊 Found ${diagramMatches.length} diagram creation messages in initial response`);
        expect(diagramMatches.length).toBe(1);
        console.log('✅ PASSED: Only ONE diagram creation message in initial response');
        return;
      }
      throw new Error('No question or diagram message received');
    }
    
    console.log('✅ Question received:', questionData.question?.substring(0, 50));
    
    // Answer the question by selecting first option
    const selectedOption = questionData.options?.[0]?.text || 'A';
    const answerMessage = `Selected: ${selectedOption}`;
    
    console.log('📝 Sending answer:', answerMessage);
    
    // Send answer - this should trigger diagram creation
    const diagramResponse = await request.post(`${BASE_URL}/api/chat`, {
      data: {
        messages: [
          { role: 'user', content: 'make llm assessor' },
          { role: 'assistant', content: questionData.question || '' },
          { role: 'user', content: answerMessage }
        ],
        currentGraph: { id: 'root', children: [], edges: [] },
        selectedNodeIds: [],
        selectedEdgeIds: [],
        images: []
      }
    });
    
    expect(diagramResponse.ok()).toBeTruthy();
    console.log('✅ Answer API call successful');
    
    // Read response and count diagram creation messages
    const diagramBody = await diagramResponse.text();
    console.log('📊 Response length:', diagramBody.length);
    
    // Count "Creating architecture diagram" messages
    const diagramMatches = diagramBody.match(/Creating.*architecture.*diagram/gi);
    const diagramCount = diagramMatches ? diagramMatches.length : 0;
    
    console.log(`📊 Found ${diagramCount} "Creating architecture diagram" message(s)`);
    
    // Also check for diagram_creation type messages in JSON
    const diagramCreationTypeMatches = diagramBody.match(/"type"\s*:\s*"diagram_creation"/gi);
    const diagramCreationTypeCount = diagramCreationTypeMatches ? diagramCreationTypeMatches.length : 0;
    
    console.log(`📊 Found ${diagramCreationTypeCount} "diagram_creation" type message(s)`);
    
    // Use the higher count (should be the same, but check both)
    const totalDiagramMessages = Math.max(diagramCount, diagramCreationTypeCount);
    
    // CRITICAL: Verify only ONE message
    expect(totalDiagramMessages).toBe(1);
    console.log('✅ PASSED: Only ONE diagram creation message sent by API');
    
    if (totalDiagramMessages > 1) {
      // Log all occurrences for debugging
      const lines = diagramBody.split('\n');
      let foundMessages = 0;
      for (const line of lines) {
        if (line.includes('Creating') && line.includes('architecture') && line.includes('diagram')) {
          foundMessages++;
          console.log(`  Message ${foundMessages}: ${line.substring(0, 100)}`);
        }
      }
      throw new Error(`Found ${totalDiagramMessages} diagram creation messages, expected exactly 1`);
    }
    
    console.log('🎉 API Single Diagram Message Test PASSED!');
  });
});




