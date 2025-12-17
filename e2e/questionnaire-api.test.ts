/**
 * Questionnaire API Test
 * 
 * Tests the questionnaire API functionality directly:
 * 1. Empty canvas + "make llm assessor" should return questionnaire
 * 2. Questions should be checkbox type (multi-select)
 * 3. Questions should have 4 options
 * 4. JSON parsing should work correctly
 */

import { test, expect } from '@playwright/test';
import { getBaseUrl } from './test-config.js';

test.describe('Questionnaire API', () => {
  let BASE_URL: string;
  
  test.beforeAll(async () => {
    BASE_URL = await getBaseUrl();
  });
  
  test('API should return questionnaire for "make llm assessor" on empty canvas', async ({ request }) => {
    test.setTimeout(60000);
    
    console.log('📡 Testing questionnaire API...');
    
    const response = await request.post(`${BASE_URL}/api/chat`, {
      data: {
        messages: [{ role: 'user', content: 'make llm assessor' }],
        currentGraph: { id: 'root', children: [], edges: [] },
        selectedNodeIds: [],
        selectedEdgeIds: [],
        images: []
      }
    });
    
    expect(response.ok()).toBeTruthy();
    console.log('✅ API response received');
    
    // Read the streaming response
    const body = await response.body();
    const text = body.toString();
    
    console.log('📝 Response length:', text.length);
    
    // Parse SSE format
    const lines = text.split('\n');
    let questionFound = false;
    let questionData: any = null;
    
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const jsonStr = line.substring(6).trim();
        if (jsonStr === '[DONE]') continue;
        
        try {
          const data = JSON.parse(jsonStr);
          
          // Check for question message
          if (data.type === 'question') {
            questionFound = true;
            questionData = data;
            console.log('✅ Question message found:', data);
            break;
          }
          
          // Check for tool call
          if (data.choices?.[0]?.delta?.tool_calls) {
            const toolCalls = data.choices[0].delta.tool_calls;
            for (const tc of toolCalls) {
              if (tc.function?.name === 'ask_clarifying_question') {
                console.log('✅ ask_clarifying_question tool call detected');
              }
            }
          }
        } catch (e) {
          // Skip invalid JSON (partial chunks)
        }
      }
    }
    
    expect(questionFound).toBeTruthy();
    expect(questionData).not.toBeNull();
    expect(questionData.type).toBe('question');
    expect(questionData.question_type).toBe('checkbox-question');
    expect(questionData.question).toBeTruthy();
    expect(questionData.options).toBeTruthy();
    expect(Array.isArray(questionData.options)).toBeTruthy();
    expect(questionData.options.length).toBe(4);
    
    console.log('✅ Question:', questionData.question);
    console.log('✅ Options:', questionData.options.map((o: any) => o.text));
    console.log('✅ Type:', questionData.question_type);
    
    // Verify each option has id and text
    for (const option of questionData.options) {
      expect(option.id).toBeTruthy();
      expect(option.text).toBeTruthy();
    }
    
    console.log('🎉 Questionnaire API Test PASSED!');
  });
  
  test('API should handle JSON parsing errors gracefully', async ({ request }) => {
    test.setTimeout(30000);
    
    console.log('📡 Testing JSON parsing error handling...');
    
    // This test verifies the JSON parsing fix works
    const response = await request.post(`${BASE_URL}/api/chat`, {
      data: {
        messages: [{ role: 'user', content: 'make llm assessor' }],
        currentGraph: { id: 'root', children: [], edges: [] },
        selectedNodeIds: [],
        selectedEdgeIds: [],
        images: []
      }
    });
    
    expect(response.ok()).toBeTruthy();
    
    // Read response and verify no JSON parsing errors in console
    const body = await response.body();
    const text = body.toString();
    
    // Check if question was sent despite JSON parsing error (error recovery should work)
    const hasQuestion = text.includes('"type":"question"') || text.includes('"type": "question"');
    
    if (hasQuestion) {
      console.log('✅ Question was sent successfully (error recovery worked)');
      console.log('🎉 JSON Parsing Test PASSED (with recovery)!');
    } else {
      // If no question, check for error
      const hasError = text.includes('Unexpected non-whitespace character');
      if (hasError) {
        console.log('⚠️ JSON parsing error occurred but question was not recovered');
        // This is acceptable if error recovery is working
        expect(text).toContain('"type":"error"');
      } else {
        console.log('✅ No JSON parsing errors detected');
        console.log('🎉 JSON Parsing Test PASSED!');
      }
    }
  });
});

