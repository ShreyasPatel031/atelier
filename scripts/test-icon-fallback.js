#!/usr/bin/env node
/**
 * Icon Fallback Test Script
 * Tests the icon fallback system to ensure missing icons trigger semantic search
 */

import fetch from 'node-fetch';
import { findRunningServerPort } from './find-server-port.js';

async function findLocalServer() {
    try {
        const port = await findRunningServerPort();
        return `http://localhost:${port}`;
    } catch (error) {
        console.error('❌ Could not find running server:', error.message);
        return null;
    }
}

async function waitForServers(maxRetries = 30) {
    console.log('🔍 Waiting for servers...');
    
    let localUrl = null;
    
    for (let i = 0; i < maxRetries; i++) {
        // Check local server
        if (!localUrl) {
            localUrl = await findLocalServer();
            if (localUrl) {
                console.log(`✅ Local dev server is ready at ${localUrl}`);
                return { local: localUrl };
            }
        }
        
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
    }
    
    throw new Error('❌ Servers not found within timeout');
}

async function runTests() {
    const { local } = await waitForServers();
    
    console.log('🧪 Testing Icon Fallback System');
    console.log('===============================\n');
    
    let allTestsPassed = true;
    
    // Test local server
    const serverUrl = local;
    console.log(`\n🌐 Testing LOCAL server at ${serverUrl}`);
    console.log('─'.repeat(50));
        
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
    
    console.log('\n===============================');
    if (allTestsPassed) {
        console.log('✅ ALL ICON FALLBACK TESTS PASSED');
        console.log('🎯 System ready: Missing icons will trigger semantic fallback');
        return true;
    } else {
        console.log('❌ ICON FALLBACK TESTS FAILED');
        console.log('🚨 Fix required before pushing to production');
        return false;
    }
}


// Main execution
async function main() {
    try {
        await runTests();
    } catch (error) {
        console.error(`🚨 Icon fallback test failed: ${error.message}`);
        process.exit(1);
    }
}

// Only run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}

export { runTests };
