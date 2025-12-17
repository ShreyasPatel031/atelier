/**
 * Test script to verify non-deterministic question behavior
 * Tests 10 scenarios and compares actual vs expected behavior
 */

// Test script for non-deterministic question behavior
// Run with: node test-question-behavior.js

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

// Sample canvas data
const sampleCanvas = {
  id: "root",
  children: [
    {
      id: "api_server",
      label: "API Server",
      type: "service"
    },
    {
      id: "database",
      label: "Database",
      type: "database"
    }
  ],
  edges: [
    {
      id: "edge_api_to_db",
      source: "api_server",
      target: "database"
    }
  ]
};

const emptyCanvas = {
  id: "root",
  children: [],
  edges: []
};

// Test scenarios
const scenarios = [
  {
    name: "make llm assessor",
    message: "make llm assessor",
    currentGraph: emptyCanvas,
    selectedNodeIds: [],
    selectedEdgeIds: [],
    images: [],
    previousMessages: [],
    expected: "ASK_QUESTION",
    reason: "vague, new design"
  },
  {
    name: "create a microservices architecture",
    message: "create a microservices architecture",
    currentGraph: emptyCanvas,
    selectedNodeIds: [],
    selectedEdgeIds: [],
    images: [],
    previousMessages: [],
    expected: "ASK_QUESTION",
    reason: "vague, new design"
  },
  {
    name: "add a database to this (with selection)",
    message: "add a database to this",
    currentGraph: sampleCanvas,
    selectedNodeIds: ["api_server"],
    selectedEdgeIds: [],
    images: [],
    previousMessages: [],
    expected: "CREATE_DIAGRAM",
    reason: "modification, clear intent from selection"
  },
  {
    name: "create a REST API with Express, PostgreSQL, and Redis",
    message: "create a REST API with Express, PostgreSQL, and Redis",
    currentGraph: emptyCanvas,
    selectedNodeIds: [],
    selectedEdgeIds: [],
    images: [],
    previousMessages: [],
    expected: "CREATE_DIAGRAM",
    reason: "specific enough, no question needed"
  },
  {
    name: "build a chat app (with image)",
    message: "build a chat app",
    currentGraph: emptyCanvas,
    selectedNodeIds: [],
    selectedEdgeIds: [],
    images: ["base64_image_data_here"],
    previousMessages: [],
    expected: "CREATE_DIAGRAM",
    reason: "image provided, create from image"
  },
  {
    name: "design a payment system",
    message: "design a payment system",
    currentGraph: sampleCanvas,
    selectedNodeIds: [],
    selectedEdgeIds: [],
    images: [],
    previousMessages: [],
    expected: "ASK_QUESTION",
    reason: "vague, new design - selection doesn't block"
  },
  {
    name: "add authentication using OAuth2",
    message: "add authentication using OAuth2",
    currentGraph: sampleCanvas,
    selectedNodeIds: [],
    selectedEdgeIds: [],
    images: [],
    previousMessages: [],
    expected: "CREATE_DIAGRAM",
    reason: "specific enough, clear intent"
  },
  {
    name: "make llm assessor (after answering 1 question)",
    message: "make llm assessor",
    currentGraph: emptyCanvas,
    selectedNodeIds: [],
    selectedEdgeIds: [],
    images: [],
    previousMessages: [
      { role: "user", content: "make llm assessor" },
      { role: "assistant", content: "What is the primary purpose?", type: "question", options: ["A", "B", "C", "D"] },
      { role: "user", content: "Selected: A" }
    ],
    expected: "CREATE_DIAGRAM",
    reason: "already answered, create based on answer"
  },
  {
    name: "create a simple todo app",
    message: "create a simple todo app",
    currentGraph: emptyCanvas,
    selectedNodeIds: [],
    selectedEdgeIds: [],
    images: [],
    previousMessages: [],
    expected: "ASK_QUESTION",
    reason: "vague, new design"
  },
  {
    name: "build a serverless API with Lambda and DynamoDB",
    message: "build a serverless API with Lambda and DynamoDB",
    currentGraph: emptyCanvas,
    selectedNodeIds: [],
    selectedEdgeIds: [],
    images: [],
    previousMessages: [],
    expected: "CREATE_DIAGRAM",
    reason: "specific enough, no question needed"
  }
];

async function testScenario(scenario) {
  console.log(`\n🧪 Testing: ${scenario.name}`);
  console.log(`   Expected: ${scenario.expected} (${scenario.reason})`);
  
  try {
    const messages = [
      ...scenario.previousMessages,
      { role: "user", content: scenario.message }
    ];
    
    // Use dynamic import for node-fetch if needed, or use built-in fetch in Node 18+
    const fetch = (typeof globalThis.fetch !== 'undefined') 
      ? globalThis.fetch 
      : (await import('node-fetch')).default;
    
    const response = await fetch(`${BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages,
        currentGraph: scenario.currentGraph,
        selectedNodeIds: scenario.selectedNodeIds,
        selectedEdgeIds: scenario.selectedEdgeIds,
        images: scenario.images
      })
    });

    if (!response.ok) {
      console.log(`   ❌ API Error: ${response.status} ${response.statusText}`);
      return { scenario: scenario.name, expected: scenario.expected, actual: "ERROR", match: false };
    }

    const text = await response.text();
    const lines = text.split('\n').filter(line => line.startsWith('data: '));
    
    let actual = "UNKNOWN";
    let questionFound = false;
    let diagramFound = false;
    
    for (const line of lines) {
      try {
        const parsed = JSON.parse(line.slice(6));
        if (parsed.type === 'question') {
          questionFound = true;
          actual = "ASK_QUESTION";
          break;
        }
        if (parsed.type === 'diagram_creation') {
          diagramFound = true;
          actual = "CREATE_DIAGRAM";
        }
      } catch (e) {
        // Skip non-JSON lines
      }
    }
    
    if (!questionFound && !diagramFound) {
      actual = "NO_RESPONSE";
    }
    
    const match = actual === scenario.expected;
    const status = match ? "✅" : "❌";
    
    console.log(`   ${status} Actual: ${actual}`);
    if (!match) {
      console.log(`   ⚠️  MISMATCH: Expected ${scenario.expected}, got ${actual}`);
    }
    
    return { scenario: scenario.name, expected: scenario.expected, actual, match };
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    return { scenario: scenario.name, expected: scenario.expected, actual: "ERROR", match: false };
  }
}

async function runAllTests() {
  console.log('🚀 Starting Non-Deterministic Question Behavior Tests\n');
  console.log(`Testing against: ${BASE_URL}`);
  
  const results = [];
  
  for (const scenario of scenarios) {
    const result = await testScenario(scenario);
    results.push(result);
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n\n📊 TEST RESULTS SUMMARY');
  console.log('='.repeat(60));
  
  const matches = results.filter(r => r.match).length;
  const mismatches = results.filter(r => !r.match).length;
  
  console.log(`✅ Matches: ${matches}/${results.length}`);
  console.log(`❌ Mismatches: ${mismatches}/${results.length}`);
  
  if (mismatches > 0) {
    console.log('\n❌ MISMATCHED SCENARIOS:');
    results.filter(r => !r.match).forEach(r => {
      console.log(`   - ${r.scenario}: Expected ${r.expected}, got ${r.actual}`);
    });
  }
  
  console.log('\n📋 DETAILED RESULTS:');
  results.forEach(r => {
    const status = r.match ? "✅" : "❌";
    console.log(`   ${status} ${r.scenario}: ${r.expected} → ${r.actual}`);
  });
  
  return results;
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('test-question-behavior.js')) {
  runAllTests().catch(console.error);
}

export { runAllTests, scenarios };

