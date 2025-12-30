#!/usr/bin/env node

/**
 * Simple script to test tool calls directly via API
 * Shows what tool the agent actually calls for different inputs
 */

const testCases = [
  { name: "Vague request", message: "make llm assessor", expected: "ask_clarifying_question" },
  { name: "Specific request", message: "create a REST API with Express, PostgreSQL, and Redis", expected: "create_architecture_diagram" },
  { name: "GitHub URL", message: "https://github.com/ShreyasPatel031/openai-realtime-elkjs-tool", expected: "codebase" },
  { name: "GitHub with context", message: "analyze this codebase: https://github.com/user/repo", expected: "codebase" },
];

async function testToolCall(testCase) {
  console.log(`\n🧪 Testing: ${testCase.name}`);
  console.log(`   Message: "${testCase.message}"`);
  console.log(`   Expected: ${testCase.expected}`);
  
  try {
    const response = await fetch('http://localhost:3000/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: testCase.message }],
        currentGraph: { id: 'root', children: [], edges: [] },
        selectedNodeIds: [],
        selectedEdgeIds: [],
        images: []
      })
    });

    if (!response.ok) {
      console.log(`   ❌ API error: ${response.status}`);
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let toolCalled = null;
    let questionText = null;
    let fullResponse = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      fullResponse += chunk;

      // Parse SSE format
      const lines = chunk.split('\n');
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const dataStr = line.substring(6).trim();
          if (dataStr === '[DONE]') continue;
          
          try {
            const data = JSON.parse(dataStr);
            
            // Check for tool calls
            if (data.choices?.[0]?.delta?.tool_calls) {
              for (const toolCall of data.choices[0].delta.tool_calls) {
                const toolName = toolCall.function?.name;
                if (toolName && !toolCalled) {
                  toolCalled = toolName;
                  console.log(`   🔧 TOOL CALLED: ${toolName}`);
                }
              }
            }
            
            if (data.choices?.[0]?.message?.tool_calls) {
              for (const toolCall of data.choices[0].message.tool_calls) {
                const toolName = toolCall.function?.name;
                if (toolName && !toolCalled) {
                  toolCalled = toolName;
                  console.log(`   🔧 TOOL CALLED: ${toolName}`);
                }
              }
            }
            
            // Check for question
            if (data.type === 'question') {
              questionText = data.question;
              console.log(`   ❓ QUESTION: ${data.question}`);
            }
            
            // Check for question in content
            if (data.choices?.[0]?.delta?.content) {
              const content = data.choices[0].delta.content;
              if (content.includes('?') && !questionText) {
                questionText = content;
              }
            }
          } catch (e) {
            // Not JSON, skip
          }
        }
      }
    }

    // Final result
    if (toolCalled) {
      const match = toolCalled === testCase.expected;
      console.log(`   ${match ? '✅' : '❌'} Result: ${toolCalled} ${match ? '(CORRECT)' : `(Expected: ${testCase.expected})`}`);
    } else if (questionText) {
      console.log(`   ❓ Question asked (no tool call detected)`);
    } else {
      console.log(`   ⚠️  No tool call or question detected`);
    }

  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
  }
}

async function runTests() {
  console.log('🚀 Testing Tool Calls\n');
  console.log('='.repeat(60));
  
  for (const testCase of testCases) {
    await testToolCall(testCase);
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait between tests
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ Tests complete');
}

runTests().catch(console.error);




