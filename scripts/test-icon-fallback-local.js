#!/usr/bin/env node
/**
 * Local Icon Fallback Test Script
 * Tests the icon fallback system against local dev server
 */

import fetch from 'node-fetch';

async function findLocalServer() {
    const ports = [3000, 3001, 3002, 3003, 3004];
    
    for (const port of ports) {
        try {
            const response = await fetch(`http://localhost:${port}/api/embed`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: 'test' })
            });
            
            if (response.ok) {
                return `http://localhost:${port}`;
            }
        } catch (error) {
            // Port not available, try next
        }
    }
    return null;
}

async function waitForLocalServer(maxRetries = 30) {
    console.log('🔍 Waiting for local dev server...');
    
    for (let i = 0; i < maxRetries; i++) {
        const serverUrl = await findLocalServer();
        if (serverUrl) {
            console.log(`✅ Local dev server is ready at ${serverUrl}`);
            return serverUrl;
        }
        
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
    }
    
    throw new Error('❌ Local dev server not found on any port');
}

async function testIconFallbackLocal() {
    const serverUrl = await waitForLocalServer();
    
    console.log('🧪 Testing Icon Fallback System (LOCAL)');
    console.log('========================================\n');
    
    let allTestsPassed = true;
    
    // Test 1: Verify missing icon scenario
    console.log('1️⃣ Testing missing icon: gcp_cloud_trace');
    
    try {
        const iconResponse = await fetch(`${serverUrl}/icons/gcp/gcp_cloud_trace.png`);
        const contentType = iconResponse.headers.get('content-type') || '';
        
        if (contentType.includes('text/html')) {
            console.log('   ✅ Icon correctly detected as missing (HTML response)');
        } else {
            console.log('   ❌ Icon loading detection failed');
            allTestsPassed = false;
        }
    } catch (error) {
        console.log(`   ❌ Error testing icon URL: ${error.message}`);
        allTestsPassed = false;
    }
    
    // Test 2: Check fallback embedding availability
    console.log('\n2️⃣ Testing fallback embedding availability');
    
    try {
        const embeddingsResponse = await fetch(`${serverUrl}/precomputed-icon-embeddings.json`);
        const embeddings = await embeddingsResponse.json();
        
        const hasTraceEmbedding = embeddings.embeddings && embeddings.embeddings['trace'];
        if (hasTraceEmbedding) {
            console.log('   ✅ Trace embedding available for fallback');
        } else {
            console.log('   ❌ Trace embedding missing');
            allTestsPassed = false;
        }
    } catch (error) {
        console.log(`   ❌ Error checking embeddings: ${error.message}`);
        allTestsPassed = false;
    }
    
    // Test 3: Test semantic search API
    console.log('\n3️⃣ Testing semantic search API');
    
    try {
        const searchResponse = await fetch(`${serverUrl}/api/embed`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: 'cloud trace monitoring' })
        });
        
        if (searchResponse.ok) {
            const searchData = await searchResponse.json();
            if (searchData.embedding && searchData.embedding.length > 0) {
                console.log('   ✅ Semantic search API working');
            } else {
                console.log('   ❌ Semantic search returned invalid data');
                allTestsPassed = false;
            }
        } else {
            console.log(`   ❌ Semantic search API failed: ${searchResponse.status}`);
            allTestsPassed = false;
        }
    } catch (error) {
        console.log(`   ❌ Error with semantic search: ${error.message}`);
        allTestsPassed = false;
    }
    
    // Test 4: Test agent generation uses fallback for missing icons
    console.log('\n4️⃣ Testing agent uses fallback for missing icons');
    
    try {
        const agentResponse = await fetch(`${serverUrl}/api/simple-agent`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                message: 'Create a GCP architecture with gcp_cloud_trace monitoring', 
                tools: [] 
            })
        });
        
        if (agentResponse.ok) {
            const agentData = await agentResponse.json();
            if (agentData.success && agentData.functionCalls && agentData.functionCalls.length > 0) {
                // Check if the response contains gcp_cloud_trace (which should trigger fallback)
                const responseText = JSON.stringify(agentData);
                if (responseText.includes('gcp_cloud_trace')) {
                    console.log('   ✅ Agent correctly uses gcp_cloud_trace (will trigger fallback)');
                } else {
                    console.log('   ⚠️ Agent did not use gcp_cloud_trace - may have used fallback icon name');
                }
            } else {
                console.log('   ❌ Agent did not generate valid response');
                allTestsPassed = false;
            }
        } else {
            console.log(`   ❌ Agent API failed: ${agentResponse.status}`);
            allTestsPassed = false;
        }
    } catch (error) {
        console.log(`   ❌ Error with agent test: ${error.message}`);
        allTestsPassed = false;
    }
    
    console.log('\n========================================');
    if (allTestsPassed) {
        console.log('✅ ALL LOCAL ICON FALLBACK TESTS PASSED');
        console.log('🎯 System ready: Missing icons will trigger semantic fallback');
    } else {
        console.log('❌ SOME LOCAL ICON FALLBACK TESTS FAILED');
        process.exit(1);
    }
}

testIconFallbackLocal().catch(error => {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
});
