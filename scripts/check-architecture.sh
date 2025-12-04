#!/bin/bash

# Architecture Enforcement Script
# Run this before implementing any feature to catch violations

echo "🏗️  Checking Architecture Compliance..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

VIOLATIONS=0

echo ""
echo "1. Checking for direct ReactFlow manipulation..."
DIRECT_REACTFLOW=$(grep -r "setNodes\|setEdges" client/components/ui/ --exclude-dir=__tests__ | grep -v "setNodesRef\|setEdgesRef" | grep -v "useState<Node\|useState<Edge" | grep -v "InteractiveCanvas.tsx\|InteractiveCanvasRefactored.tsx\|InteractiveCanvasSimple.tsx\|ElkDebugViewer.tsx" | grep -v "// OK:" || true)
if [ -n "$DIRECT_REACTFLOW" ]; then
    echo -e "${RED}❌ VIOLATION: Direct ReactFlow manipulation found:${NC}"
    echo "$DIRECT_REACTFLOW"
    VIOLATIONS=$((VIOLATIONS + 1))
else
    echo -e "${GREEN}✅ No direct ReactFlow manipulation${NC}"
fi

echo ""
echo "2. Checking for ELK usage in UI components..."
ELK_IN_UI=$(grep -r "elk\.layout\|elk\.graph\|new ELK\|const elk = new ELK" client/components/ui/ --exclude-dir=__tests__ | grep -v "ElkDebugViewer.tsx" | grep -v "// OK:" || true)
if [ -n "$ELK_IN_UI" ]; then
    echo -e "${RED}❌ VIOLATION: ELK usage in UI components:${NC}"
    echo "$ELK_IN_UI"
    VIOLATIONS=$((VIOLATIONS + 1))
else
    echo -e "${GREEN}✅ No ELK usage in UI components${NC}"
fi

echo ""
echo "3. Checking for Domain access in renderers..."
DOMAIN_IN_RENDERER=$(grep -r "domain\." client/core/renderer/ --exclude-dir=__tests__ | grep -v "domainGraph\|domainNode\|domainStructure" | grep -v "// OK:" || true)
if [ -n "$DOMAIN_IN_RENDERER" ]; then
    echo -e "${RED}❌ VIOLATION: Domain access in renderer:${NC}"
    echo "$DOMAIN_IN_RENDERER"
    VIOLATIONS=$((VIOLATIONS + 1))
else
    echo -e "${GREEN}✅ No improper Domain access in renderers${NC}"
fi

echo ""
echo "4. Checking for orchestration logic in hooks..."
ORCHESTRATION_IN_HOOKS=$(grep -r "apply\|initializeOrchestrator" client/hooks/ --exclude-dir=__tests__ | grep -v "import.*apply\|// OK:" || true)
if [ -n "$ORCHESTRATION_IN_HOOKS" ]; then
    echo -e "${YELLOW}⚠️  WARNING: Orchestration logic in hooks (review needed):${NC}"
    echo "$ORCHESTRATION_IN_HOOKS"
    # Don't count as violation, but flag for review
else
    echo -e "${GREEN}✅ No orchestration logic in hooks${NC}"
fi

echo ""
echo "5. Checking for ELK fallbacks in FREE mode..."
ELK_FALLBACKS=$(grep -r "fallback.*elk\|elk.*fallback" client/ --exclude-dir=__tests__ | grep -i "free\|user" | grep -v "// OK:" || true)
if [ -n "$ELK_FALLBACKS" ]; then
    echo -e "${RED}❌ VIOLATION: ELK fallbacks in FREE mode:${NC}"
    echo "$ELK_FALLBACKS"
    VIOLATIONS=$((VIOLATIONS + 1))
else
    echo -e "${GREEN}✅ No ELK fallbacks in FREE mode${NC}"
fi

echo ""
echo "6. Checking for multiple rendering paths..."
MULTIPLE_RENDER_PATHS=$(grep -r "renderDomainToReactFlow\|FreeRenderer\|ReactFlowRenderer" client/ --exclude-dir=__tests__ | grep -v "// DEPRECATED\|// OK:\|comment.*ReactFlowRenderer" || true)
if [ -n "$MULTIPLE_RENDER_PATHS" ]; then
    echo -e "${RED}❌ VIOLATION: Multiple rendering paths found:${NC}"
    echo "$MULTIPLE_RENDER_PATHS"
    VIOLATIONS=$((VIOLATIONS + 1))
else
    echo -e "${GREEN}✅ Single canonical rendering path${NC}"
fi

echo ""
echo "═══════════════════════════════════════"
if [ $VIOLATIONS -eq 0 ]; then
    echo -e "${GREEN}🎉 Architecture compliance: PASSED${NC}"
    echo "You can proceed with feature implementation."
    exit 0
else
    echo -e "${RED}💥 Architecture compliance: FAILED${NC}"
    echo "Found $VIOLATIONS violation(s). Fix these before implementing your feature."
    echo ""
    echo "📚 See docs/FEATURE_DEVELOPMENT_TEMPLATE.md for guidance."
    exit 1
fi
