#!/usr/bin/env node
/**
 * Find Running Server Port Utility
 * 
 * Dynamically detects which port the development server is running on
 * by checking common ports and testing connectivity.
 */

import fetch from 'node-fetch';
import { spawn } from 'child_process';

// Check higher ports first (dev server often uses 3004+ when 3000-3003 are in use)
const COMMON_PORTS = [3004, 3005, 3006, 3007, 3000, 3001, 3002, 3003, 3008, 3009];

async function checkPort(port) {
    try {
        // Try to fetch the root page or canvas page to check if server is running
        const response = await fetch(`http://localhost:${port}/canvas`, {
            method: 'GET',
            timeout: 1000
        });
        return response.ok || response.status === 200;
    } catch (error) {
        // Also try root path
        try {
            const response = await fetch(`http://localhost:${port}/`, {
                method: 'GET',
                timeout: 1000
            });
            return response.ok || response.status === 200;
        } catch (e) {
            return false;
        }
    }
}

async function findRunningServerPort() {
    console.log('🔍 Searching for running development server...');
    
    for (const port of COMMON_PORTS) {
        if (await checkPort(port)) {
            console.log(`✅ Found server running on port ${port}`);
            return port;
        }
    }
    
    throw new Error('❌ No running development server found on common ports (3000-3005)');
}

// Export for use in other scripts
export { findRunningServerPort, COMMON_PORTS };

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
    findRunningServerPort()
        .then(port => {
            console.log(port);
            process.exit(0);
        })
        .catch(error => {
            console.error(error.message);
            process.exit(1);
        });
}
