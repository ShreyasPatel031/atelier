/**
 * E2E Test Configuration Utilities
 * 
 * Provides dynamic configuration for E2E tests including
 * automatic server port detection and environment setup.
 */

import { findRunningServerPort } from '../scripts/find-server-port.js';

/**
 * Get the base URL for E2E tests
 * Uses environment variable if set, otherwise dynamically detects running server
 */
export async function getBaseUrl() {
    if (process.env.E2E_BASE_URL) {
        return process.env.E2E_BASE_URL;
    }
    
    try {
        const port = await findRunningServerPort();
        return `http://localhost:${port}`;
    } catch (error) {
        console.warn(`⚠️  Could not detect running server: ${error.message}`);
        console.warn('   Falling back to default port 3000');
        return 'http://localhost:3000';
    }
}

/**
 * Setup function for E2E tests
 * Call this in test.describe.configure() or beforeEach()
 */
export async function setupTestConfig() {
    const baseUrl = await getBaseUrl();
    console.log(`🌐 E2E tests using base URL: ${baseUrl}`);
    return { baseUrl };
}

export default {
    getBaseUrl,
    setupTestConfig
};
