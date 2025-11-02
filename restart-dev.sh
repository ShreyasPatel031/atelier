#!/bin/bash
# Clear all caches and restart dev server

echo "🧹 Clearing caches..."
rm -rf node_modules/.vite
rm -rf dist
rm -rf .vite
rm -rf client/node_modules/.vite 2>/dev/null || true

echo "✅ Cache cleared"
echo "🚀 Starting dev server..."
npm run dev

