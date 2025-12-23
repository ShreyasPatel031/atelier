# Diff Summary: system-design worktree vs main branch

## Overview
- **Total files changed**: 464 files
- **Total changes**: ~3.1M insertions, ~15.8K deletions (mostly from generated embeddings file)
- **Commits ahead of main**: 20 commits

## Key Feature Additions

### 1. **Codebase Tool Integration** (DeepWiki)
- `api/deepwiki.ts` - New WebSocket client for DeepWiki Python backend
- `api/chat.js` - Enhanced with codebase tool that calls DeepWiki
- `agent/tool-routing.test.ts` - Tests for tool selection (codebase, create_architecture_diagram, ask_clarifying_question)
- `e2e/github-codebase-to-mermaid.test.ts` - End-to-end test for GitHub URL → Mermaid diagram flow

### 2. **Agent Configuration & Tool Routing**
- `api/agentConfig.lean.ts` - Lean runtime agent config with diagram conversion instructions
- `api/simple-agent.ts` - Diagram agent that processes Mermaid diagrams generically
- `api/chat.js` - Chat agent with strict input routing (3 priorities: image/codebase → edit → questions)
- `api/toolCatalog.ts` - Tool definitions

### 3. **Canvas Architecture Refactoring**
- `client/core/orchestration/` - New orchestration layer (Orchestrator, Policy, handlers)
- `client/core/viewstate/` - ViewState management layer
- `client/core/renderer/` - ReactFlow adapter for rendering
- `client/core/layout/` - Libavoid routing service
- `client/core/drag/` - Drag and reparenting handlers

### 4. **UI Components**
- `client/components/chat/RightPanelChat.tsx` - New chat panel component
- `client/components/ui/CanvasToolbar.tsx` - Canvas toolbar
- `client/components/ui/ArchitectureSidebar.tsx` - Architecture sidebar
- `client/components/node/DraftGroupNode.tsx` - Draft group node for FREE mode
- `client/components/node/ConnectorDots.tsx` - Connector dots for edge creation

### 5. **Edge Routing**
- `client/components/StepEdge.tsx` - Enhanced step edge with Libavoid routing
- `client/core/layout/LibavoidRoutingService.ts` - Libavoid integration
- `client/components/routing/EdgeRoutingController.tsx` - Edge routing controller

### 6. **Services & Utilities**
- `client/services/UrlArchitectureService.ts` - URL-based architecture loading
- `client/services/anonymousArchitectureService.ts` - Anonymous save/load
- `client/services/sharingService.ts` - Architecture sharing
- `client/utils/iconFallbackService.ts` - Semantic icon fallback
- `client/utils/canvasPersistence.ts` - Canvas state persistence

### 7. **Testing Infrastructure**
- `e2e/canvas-comprehensive/` - Comprehensive canvas test suite
- `e2e/github-codebase-to-mermaid.test.ts` - Codebase tool E2E test
- `e2e/question-behavior-ui.test.ts` - Question behavior tests
- `agent/tool-routing.test.ts` - Tool routing tests

### 8. **Configuration & Deployment**
- `.githooks/pre-push` - Pre-push hook with Vercel preview testing
- `.githooks/git-push-wrapper.sh` - Git push wrapper
- `vercel.json` - Vercel configuration with `--legacy-peer-deps`
- `.nvmrc` - Node version specification (20)
- `.github/workflows/ci.yml` - CI workflow

## Key Removals

- `api/stream.ts` - Removed legacy streaming infrastructure
- `api/token.js` - Removed token API
- `client/components/StreamViewer.tsx` - Removed stream viewer
- `client/components/ChatTester.tsx` - Removed chat tester
- `client/components/console/` - Removed console components
- `client/reasoning/` - Removed reasoning module (replaced by new agent system)

## Architecture Changes

### Before (main):
- Direct ReactFlow manipulation
- Mixed concerns (layout, rendering, state in components)
- Legacy streaming infrastructure

### After (system-design):
- **Orchestration → Domain → Layout → ViewState → Renderer** flow
- Clear separation of concerns
- ViewState as single source of truth for rendering
- Generic diagram parsing (not hardcoded to Mermaid)
- FREE mode bypasses ELK converter entirely

## Recent Commits (Last 20)

1. Fix TypeScript compilation error in agentConfig.lean.ts
2. Remove unused @testing-library/react-hooks to fix peer dependency conflict
3. Fix codebase tool flow: Remove hardcoded Mermaid detection, make diagram parsing generic
4. Fix: Prevent exponential question generation
5. Fix duplicate diagram generation
6. Refactor: Migrate to Responses API
7. Fix edge routing: trigger rerouting on obstacle changes
8. Various test fixes and improvements

## Notable Files Changed

### API Layer
- `api/chat.js` - Major refactor for tool routing
- `api/simple-agent.ts` - New diagram agent
- `api/deepwiki.ts` - New DeepWiki integration
- `api/agentConfig.lean.ts` - Lean agent config

### Client Core
- `client/core/orchestration/Orchestrator.ts` - Main orchestrator
- `client/core/viewstate/ViewState.ts` - ViewState management
- `client/core/renderer/ReactFlowAdapter.ts` - ReactFlow adapter
- `client/components/ui/InteractiveCanvas.tsx` - Major refactor (6000+ lines)

### Tests
- `agent/tool-routing.test.ts` - Tool routing tests
- `e2e/github-codebase-to-mermaid.test.ts` - Codebase tool E2E test
- `e2e/canvas-comprehensive/` - Comprehensive test suite

## Configuration Files
- `package.json` - Added `ws` dependency, removed `@testing-library/react-hooks`
- `vercel.json` - Added `--legacy-peer-deps` to install command
- `.nvmrc` - Added Node 20 specification
- `.cursorrules` - Added workspace rules
- `.cursor/rules/` - Multiple architecture enforcement rules



