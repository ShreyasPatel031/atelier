# Parallel Test Execution Strategy

## Overview

Tests are organized into **Playwright Projects** that run in parallel with isolated browser contexts. This prevents state interference between different test categories.

## Project Structure

```
e2e/canvas-comprehensive/
├── core-interactions/     → Project: canvas-core-interactions
├── layer-sync/            → Project: canvas-layer-sync  
├── persistence/           → Project: canvas-persistence
├── architecture/          → Project: canvas-architecture
├── drag/                  → Project: canvas-drag
└── edge-routing/          → Project: edge-routing
```

## How Parallel Execution Works

1. **Each Project = Separate Browser Context**
   - Projects run in parallel with each other
   - Each project gets its own isolated browser context
   - No shared state between projects

2. **Tests Within Project = Sequential (configurable)**
   - Tests within a project run sequentially by default (workers: 1)
   - Can increase workers per project if tests don't share state

3. **Parallel Categories**
   - ✅ Edge routing tests can run while canvas interaction tests run
   - ✅ All 5 canvas categories can run simultaneously
   - ✅ No interference because each has separate browser context

## Running Tests

### Run All Canvas Tests in Parallel (5 projects)
```bash
npx playwright test --project=canvas-core-interactions --project=canvas-layer-sync --project=canvas-persistence --project=canvas-architecture --project=canvas-drag
```

### Run Specific Category
```bash
npx playwright test --project=canvas-core-interactions
```

### Run Edge Routing in Parallel with Canvas
```bash
npx playwright test --project=edge-routing --project=canvas-core-interactions
```

### Run Everything (all projects in parallel)
```bash
npx playwright test
```

## Performance

- **Sequential**: ~5-10 minutes for all 24 tests
- **Parallel (5 workers)**: ~2-3 minutes (fastest category determines total time)
- **Isolation**: Each project uses separate browser context, preventing state leaks

## Benefits

1. ✅ **No State Interference**: Each project has isolated browser context
2. ✅ **Faster Execution**: Run multiple categories simultaneously  
3. ✅ **Easy Debugging**: Run one category at a time when debugging
4. ✅ **Scalable**: Easy to add more categories or increase workers

## Configuration

Projects are configured in `playwright.config.ts`. Each project can have:
- `workers`: Number of parallel workers within that project
- `testMatch`: Which tests belong to this project
- Separate timeout/retry settings if needed

