import { test, expect } from '@playwright/test';
import { getBaseUrl } from '../e2e/test-config.js';

const BASE_URL = 'http://localhost:3000';

const scenarios = [
  // Codebase (3)
  { name: "Plain GitHub URL", message: "https://github.com/user/repo", expected: "CALL_CODEBASE" },
  { name: "GitHub with context", message: "analyze https://github.com/user/repo", expected: "CALL_CODEBASE" },
  { name: "GitLab URL", message: "https://gitlab.com/project/repo", expected: "CALL_CODEBASE" },
  
  // Diagram (3)
  { name: "Specific tech", message: "create REST API with Express, PostgreSQL, Redis", expected: "CREATE_DIAGRAM" },
  { name: "OAuth2", message: "add authentication using OAuth2", expected: "CREATE_DIAGRAM" },
  { name: "Lambda", message: "build serverless API with Lambda and DynamoDB", expected: "CREATE_DIAGRAM" },
  
  // Question (3)
  { name: "Vague 1", message: "make llm assessor", expected: "ASK_QUESTION" },
  { name: "Vague 2", message: "create a payment system", expected: "ASK_QUESTION" },
  { name: "Vague 3", message: "build a chat app", expected: "ASK_QUESTION" },
];

test('Tool routing test', async ({ page }) => {
  test.setTimeout(120000);
  
  await page.goto(`${BASE_URL}/canvas`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  
  const results = [];
  
  for (const scenario of scenarios) {
    console.log(`\n🧪 Testing: ${scenario.name}`);
    console.log(`   Message: "${scenario.message}"`);
    console.log(`   Expected: ${scenario.expected}`);
    
    // Clear chat
    await page.evaluate(() => {
      localStorage.removeItem('chatMessages');
      localStorage.removeItem('chatHistory');
    });
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    
    // Find input and send
    const input = page.locator('textarea, input[type="text"]').first();
    await input.fill(scenario.message);
    await input.press('Enter');
    
    // Wait for response
    let detected = 'UNKNOWN';
    let toolCalled = null;
    
    const toolListener = (response: any) => {
      if (response.url().includes('/api/chat')) {
        response.text().then((body: string) => {
          const lines = body.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const dataStr = line.substring(6).trim();
              if (dataStr && dataStr !== '[DONE]') {
                try {
                  const data = JSON.parse(dataStr);
                  if (data.choices?.[0]?.delta?.tool_calls) {
                    for (const tc of data.choices[0].delta.tool_calls) {
                      if (tc.function?.name) {
                        toolCalled = tc.function.name;
                        console.log(`   🔧 Tool detected: ${toolCalled}`);
                      }
                    }
                  }
                  if (data.choices?.[0]?.message?.tool_calls) {
                    for (const tc of data.choices[0].message.tool_calls) {
                      if (tc.function?.name) {
                        toolCalled = tc.function.name;
                        console.log(`   🔧 Tool detected: ${toolCalled}`);
                      }
                    }
                  }
                } catch (e) {}
              }
            }
          }
        }).catch(() => {});
      }
    };
    
    page.on('response', toolListener);
    
    // Wait for tool call or UI response (max 10s)
    const startTime = Date.now();
    while (Date.now() - startTime < 10000 && !toolCalled) {
      await page.waitForTimeout(500);
      const text = await page.textContent('body').catch(() => '') || '';
      if (/Question/i.test(text) || /Creating|Generating/i.test(text)) break;
    }
    page.off('response', toolListener);
    
    // Determine result
    if (toolCalled === 'codebase') detected = 'CALL_CODEBASE';
    else if (toolCalled === 'create_architecture_diagram') detected = 'CREATE_DIAGRAM';
    else if (toolCalled === 'ask_clarifying_question') detected = 'ASK_QUESTION';
    else {
      const text = await page.textContent('body').catch(() => '') || '';
      if (/Question/i.test(text) && /[ABCD]\./.test(text)) detected = 'ASK_QUESTION';
      else if (/Creating|Generating/i.test(text)) detected = 'CREATE_DIAGRAM';
    }
    
    const match = detected === scenario.expected;
    console.log(`   ${match ? '✅' : '❌'} Got: ${detected}`);
    
    results.push({ ...scenario, actual: detected, match });
  }
  
  // Summary
  console.log('\n📊 RESULTS:');
  const passed = results.filter(r => r.match).length;
  console.log(`✅ Passed: ${passed}/9`);
  results.forEach(r => {
    console.log(`   ${r.match ? '✅' : '❌'} ${r.name}: Expected ${r.expected}, got ${r.actual}`);
  });
  
  expect(passed).toBe(9);
});

