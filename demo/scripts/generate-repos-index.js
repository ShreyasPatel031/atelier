#!/usr/bin/env node
/**
 * Generates demo/repos/index.json by listing directory names in demo/repos.
 * Preserves existing { id, label, description } entries when index.json already
 * uses the rich shape; new folders get default label/description.
 * Run from repo root: node demo/scripts/generate-repos-index.js
 * Used by the viewer to populate the repo dropdown dynamically.
 */

const fs = require('fs');
const path = require('path');

const reposDir = path.join(__dirname, '..', 'repos');
const outFile = path.join(reposDir, 'index.json');

function humanizeSlug(name) {
  return name
    .split(/[_-]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

/** @returns {Map<string, { id: string, label: string, description: string }>} */
function loadExistingById() {
  if (!fs.existsSync(outFile)) {
    return new Map();
  }
  try {
    const raw = JSON.parse(fs.readFileSync(outFile, 'utf8'));
    if (!Array.isArray(raw)) {
      return new Map();
    }
    const map = new Map();
    for (const item of raw) {
      if (typeof item === 'string') {
        map.set(item, {
          id: item,
          label: humanizeSlug(item),
          description: '',
        });
      } else if (item && typeof item === 'object' && typeof item.id === 'string') {
        map.set(item.id, {
          id: item.id,
          label: typeof item.label === 'string' ? item.label : humanizeSlug(item.id),
          description: typeof item.description === 'string' ? item.description : '',
        });
      }
    }
    return map;
  } catch {
    return new Map();
  }
}

if (!fs.existsSync(reposDir)) {
  console.error('repos directory not found:', reposDir);
  process.exit(1);
}

const entries = fs.readdirSync(reposDir, { withFileTypes: true });
const names = entries
  .filter((e) => e.isDirectory() && !e.name.startsWith('.'))
  .map((e) => e.name)
  // Plain Unicode sort (matches Python sorted()) so JS and demo_viewer_sync agree
  .sort();

const byId = loadExistingById();
const rows = names.map((id) => {
  const prev = byId.get(id);
  if (prev) {
    return prev;
  }
  return {
    id,
    label: humanizeSlug(id),
    description: '',
  };
});

fs.writeFileSync(outFile, JSON.stringify(rows, null, 2) + '\n', 'utf8');
console.log('Wrote', rows.length, 'repos to', outFile);
