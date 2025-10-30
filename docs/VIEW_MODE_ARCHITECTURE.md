# View Mode Architecture

## Overview

The application uses a centralized ViewMode system to control UI behavior across different contexts (embed, canvas, auth). This ensures consistent behavior and makes it easy to configure what features are available in each view mode.

## Core Principle

**All UI visibility and feature toggles should be configured in `ViewModeContext.tsx`, not hardcoded in individual components.**

## View Modes

### 1. Framer Mode (`/embed`)
- **Purpose**: Embedded view for Framer components
- **Key Features**: 
  - No chat panel or chat agent icon (clean embed experience)
  - Atelier ProcessingStatusIcon always visible (top-left)
  - Edit button to transition to canvas view
  - Chatbox visible (only way to interact with AI)
  - Messages persist when transitioning to other views

### 2. Canvas Mode (`/canvas`)
- **Purpose**: Public/anonymous mode for sharing
- **Key Features**:
  - Full chat panel and chat agent icon
  - Atelier ProcessingStatusIcon always visible (top-left)
  - No bottom chatbox (use right chat panel instead)
  - Save button (redirects to auth)
  - No architecture management

### 3. Auth Mode (`/auth`)
- **Purpose**: Full authenticated experience
- **Key Features**:
  - All features enabled
  - Full chat panel and chat agent icon
  - Atelier ProcessingStatusIcon always visible (top-left)
  - No bottom chatbox (use right chat panel instead)
  - Architecture management
  - Dev panel access

## Configuration Pattern

### ✅ Correct Approach
```typescript
// In ViewModeContext.tsx
const VIEW_MODE_CONFIGS = {
  framer: {
    showChatPanel: false,  // Configure here
    showAgentIcon: false,
    // ... other configs
  }
};

// In component
const { config } = useViewMode();
return (
  <>
    {config.showChatPanel && <ChatPanel />}
    {config.showAgentIcon && <AgentIcon />}
  </>
);
```

### ❌ Incorrect Approach
```typescript
// Don't hardcode view mode checks in components
const showChat = config.mode !== 'framer'; // Bad!
```

## Benefits

1. **Centralized Configuration**: All view mode behavior in one place
2. **Consistency**: No scattered hardcoded checks across components
3. **Maintainability**: Easy to add new view modes or modify existing ones
4. **Type Safety**: TypeScript ensures all configs are properly defined

## Adding New Features

When adding a new UI feature that should be conditionally shown:

1. Add the config property to `ViewModeConfig` interface
2. Set the appropriate values in `VIEW_MODE_CONFIGS`
3. Use `config.yourFeature` in components, never hardcode mode checks

## Message Persistence

Messages entered in the chatbox (embed view) are automatically persisted using localStorage and restored when transitioning to other views. This ensures a seamless user experience when moving from embed → canvas → auth modes.

## Implementation Files

- `client/contexts/ViewModeContext.tsx` - Core configuration
- `client/utils/chatPersistence.ts` - Message persistence utilities
- `client/components/App.jsx` - Main app layout with conditional rendering
- `client/components/ui/InteractiveCanvas.tsx` - Canvas with conditional agent icon
