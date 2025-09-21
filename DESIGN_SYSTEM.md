# Architecture Generator Design System

## Overview
A comprehensive design system for the Architecture Generator application, focusing on clean layouts, consistent spacing, intuitive interactions, and professional visual hierarchy.

## Color Palette

### Primary Colors
- **Gray Scale**: `gray-50`, `gray-100`, `gray-200`, `gray-300`, `gray-400`, `gray-500`, `gray-600`, `gray-700`, `gray-800`, `gray-900`
- **White**: `white` - Primary background for cards, buttons, and panels
- **Black**: `black` - Text and accent elements

### Usage Guidelines
- **Backgrounds**: `bg-gray-50` for panels, `bg-white` for cards and buttons
- **Text**: `text-gray-700` for primary text, `text-gray-500` for secondary text, `text-gray-300` for muted text
- **Borders**: `border-gray-200` for subtle borders, `border-gray-300` for stronger borders
- **Interactive States**: `hover:bg-gray-50` for subtle hover effects

## Layout Structure

### Main Application Layout
```
┌─────────────────────────────────────────────────────────────┐
│ [Atelier]                    Canvas Area              [Agent] │
│ Icon                         (flex-1)                   Icon  │
│                                                             │
│ Left Panel                  Main Content               Right │
│ (72px collapsed)            (responsive)              Panel │
│ (320px expanded)                                        (72px│
│                                                      collapsed│
│                                                      / 384px  │
│                                                      expanded)│
└─────────────────────────────────────────────────────────────┘
```

### Panel Specifications
- **Left Sidebar**: 
  - Collapsed: `w-18` (72px)
  - Expanded: `w-80` (320px)
- **Right Panel**: 
  - Collapsed: `w-18` (72px)
  - Expanded: `w-96` (384px)

### Canvas Responsive Behavior
- **Main Content Area**: `flex-1` with dynamic margins
- **Left Panel Collapsed**: `ml-0` (no left margin)
- **Left Panel Expanded**: `ml-[72px]` (72px left margin)
- **Canvas Buttons**: Dynamic positioning based on right panel state
  - Right Panel Collapsed: `right-20` (80px from right)
  - Right Panel Expanded: `right-[25rem]` (400px from right)

## Icon System

### Icon Specifications
- **Size**: `w-4 h-4` (16px) for small icons, `w-8 h-8` (32px) for large icons
- **Shape**: `rounded-lg` (8px border radius) - consistent with design language
- **Background**: `bg-white` with `border border-gray-200`
- **Shadow**: `shadow-lg` for floating elements, `shadow-sm` for subtle depth

### Icon Positioning
- **Atelier Icon**: `absolute top-4 left-4` (16px from top-left)
- **Agent Icon**: `absolute top-4 right-4` (16px from top-right)
- **Perfect Centering**: Both icons centered in 72px collapsed panels
  - 16px + 40px icon + 16px = 72px total

## Interaction Patterns

### Hover Overlay System
Both Atelier and Agent icons use consistent hover overlays:

```tsx
<div className="relative group">
  <MainIcon />
  <button className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
    {isCollapsed ? <ExpandIcon /> : <CollapseIcon />}
  </button>
</div>
```

### Interaction States
- **Default**: Main icon visible
- **Hover**: Overlay fades in showing expand/collapse action
- **Click**: Toggle panel state
- **Transition**: `transition-opacity duration-200` for smooth fade

## Component Patterns

### Button Styling
```tsx
className="flex items-center gap-2 px-3 py-2 rounded-lg shadow-lg border border-gray-200 hover:bg-gray-50 hover:shadow-md transition-all duration-200"
```

### Card Styling
```tsx
className="bg-white border border-gray-200 rounded-lg shadow-sm"
```

### Input Styling
```tsx
className="w-full h-10 pl-10 pr-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-gray-400"
```

### Panel Styling
```tsx
className="relative h-full bg-gray-50 text-gray-700 border-l border-gray-200 transition-all duration-300 ease-in-out"
```

## Spacing System

### Consistent Spacing
- **Panel Padding**: `p-4` (16px) for content areas
- **Icon Spacing**: `gap-3` (12px) between related elements
- **Button Spacing**: `gap-2` (8px) between button elements
- **List Spacing**: `space-y-2` (8px) between list items
- **Top Padding**: `pt-16` (64px) for consistent icon-to-content spacing
- **Divider Spacing**: `my-4` (16px) around dividers for equal spacing above/below
- **Content Spacing**: `mt-4` (16px) between divider and content for visual balance

### Panel Spacing Pattern
Both left and right panels follow the same spacing hierarchy:
- **Icon to Divider**: `pt-16` (64px) from icon + `my-4` (16px) = 80px total
- **Divider to Content**: `mt-4` (16px) for visual balance
- **Divider Side Margins**: `mx-4` (16px) for consistent edge spacing

### Architecture List Items
- **Padding**: `p-2 pl-4` (8px vertical, 16px left) for consistent alignment
- **Font Size**: `text-sm` for compact appearance
- **Hover State**: `hover:bg-gray-50` for subtle feedback

## Animation & Transitions

### Panel Transitions
- **Duration**: `duration-300` (300ms) for panel expand/collapse
- **Easing**: `ease-in-out` for smooth acceleration/deceleration
- **Properties**: `transition-all` for comprehensive animation

### Hover Transitions
- **Duration**: `duration-200` (200ms) for quick responsiveness
- **Properties**: `transition-opacity` for fade effects, `transition-shadow` for depth changes

### Button Transitions
- **Duration**: `duration-200` (200ms) for immediate feedback
- **Properties**: `transition-all` for comprehensive state changes

## Typography

### Font Sizes
- **Primary Text**: `text-base` (16px) for main content
- **Secondary Text**: `text-sm` (14px) for labels and descriptions
- **Small Text**: `text-xs` (12px) for timestamps and metadata

### Font Weights
- **Bold**: `font-medium` for emphasis
- **Normal**: Default weight for body text

## Accessibility

### Focus States
- **Focus Ring**: `focus:ring-2 focus:ring-gray-400` for keyboard navigation
- **Focus Border**: `focus:border-gray-400` for input elements
- **Focus Outline**: `focus:outline-none` with custom ring implementation

### Interactive Elements
- **Minimum Touch Target**: 40px × 40px (`w-10 h-10`)
- **Hover States**: Clear visual feedback for all interactive elements
- **Disabled States**: `cursor-not-allowed` and muted colors

## Responsive Design

### Breakpoint Strategy
- **Mobile First**: Base styles for mobile devices
- **Desktop Enhancement**: Additional spacing and sizing for larger screens
- **Flexible Layouts**: `flex-1` and percentage-based widths for adaptability

### Panel Behavior
- **Collapsed State**: Minimal width (72px) with centered icons
- **Expanded State**: Full width with content areas
- **Smooth Transitions**: All state changes animated smoothly

## Implementation Guidelines

### CSS Classes
- Use Tailwind utility classes for consistency
- Prefer semantic class names over arbitrary values
- Maintain consistent spacing ratios (4px, 8px, 16px, 24px)

### Component Structure
- Keep components focused and single-purpose
- Use consistent prop interfaces across similar components
- Implement proper TypeScript types for all props

### State Management
- Use React hooks for local component state
- Pass panel states as props for cross-component communication
- Implement proper cleanup for event listeners and timeouts

## Quality Standards

### Visual Consistency
- All icons use the same border radius (`rounded-lg`)
- Consistent shadow depths across similar elements
- Uniform spacing ratios throughout the application

### Interaction Consistency
- All hover states use the same transition duration
- Consistent button styling across all components
- Uniform focus states for accessibility

### Performance
- Use CSS transitions over JavaScript animations
- Implement proper cleanup for event listeners
- Optimize re-renders with proper dependency arrays

---

*This design system ensures a cohesive, professional, and accessible user experience across the Architecture Generator application.*