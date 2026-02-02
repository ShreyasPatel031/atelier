#!/usr/bin/env node
/**
 * Generates demo/repos/index.json by listing directory names in demo/repos.
 * Run from repo root: node demo/scripts/generate-repos-index.js
 * Used by the viewer to populate the repo dropdown dynamically.
 */

const fs = require('fs');
const path = require('path');

const reposDir = path.join(__dirname, '..', 'repos');
const outFile = path.join(reposDir, 'index.json');

if (!fs.existsSync(reposDir)) {
  console.error('repos directory not found:', reposDir);
  process.exit(1);
}

const entries = fs.readdirSync(reposDir, { withFileTypes: true });
const names = entries
  .filter((e) => e.isDirectory() && !e.name.startsWith('.'))
  .map((e) => e.name)
  .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));

fs.writeFileSync(outFile, JSON.stringify(names, null, 2) + '\n', 'utf8');
console.log('Wrote', names.length, 'repos to', outFile);
