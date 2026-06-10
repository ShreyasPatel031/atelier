#!/usr/bin/env node
/**
 * Runs a command after applying scripts/cursor-sdk.env and .env (gitignored).
 * Example: node scripts/run_with_cursor_env.mjs node scripts/diagram_ask_watcher.mjs --repo atelier-tdc8
 */
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { applyLocalCursorSdkEnv } from './load_cursor_sdk_env.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
applyLocalCursorSdkEnv(ROOT);

const rest = process.argv.slice(2);
if (rest.length === 0) {
    console.error('Usage: node scripts/run_with_cursor_env.mjs <command> [args...]');
    process.exit(1);
}
const [cmd, ...args] = rest;
const child = spawn(cmd, args, { stdio: 'inherit', env: process.env, cwd: ROOT });
child.on('exit', (code, signal) => {
    if (signal) process.kill(process.pid, signal);
    process.exit(code ?? 1);
});
