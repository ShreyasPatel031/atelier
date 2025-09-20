# Architecture Generator Design System

## Overview
This design system defines the visual language, components, and patterns used throughout the Architecture Generator application. It ensures consistency, accessibility, and maintainability across all interface elements.

## Color Palette

### Primary Colors
```css
/* Backgrounds */
--bg-primary: #ffffff      /* White - Main backgrounds */
--bg-secondary: #f9fafb    /* Gray-50 - Secondary backgrounds */
--bg-tertiary: #f3f4f6     /* Gray-100 - Tertiary backgrounds */

/* Text */
--text-primary: #111827    /* Gray-900 - Primary text */
--text-secondary: #374151  /* Gray-700 - Secondary text */
--text-tertiary: #6b7280   /* Gray-500 - Tertiary text */
--text-quaternary: #9ca3af /* Gray-400 - Placeholder text */

/* Borders */
--border-primary: #e5e7eb  /* Gray-200 - Primary borders */
--border-secondary: #d1d5db /* Gray-300 - Secondary borders */

/* Interactive Elements */
--interactive-primary: #111827    /* Gray-900 - Primary buttons */
--interactive-primary-hover: #1f2937 /* Gray-800 - Primary button hover */
--interactive-disabled: #d1d5db     /* Gray-300 - Disabled state */
```

### Semantic Colors
```css
/* States */
--success: #10b981     /* Green-500 */
--warning: #f59e0b     /* Amber-500 */
--error: #ef4444       /* Red-500 */
--info: #3b82f6        /* Blue-500 - Used sparingly */
```

## Typography

### Font Stack
```css
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
```

### Scale
- **Heading Large**: `text-lg font-semibold` (18px, 600 weight)
- **Heading Medium**: `text-base font-semibold` (16px, 600 weight)
- **Body**: `text-sm` (14px, 400 weight)
- **Caption**: `text-xs` (12px, 400 weight)

## Spacing System

### Scale (Tailwind)
- **xs**: `0.25rem` (4px)
- **sm**: `0.5rem` (8px)
- **md**: `0.75rem` (12px)
- **lg**: `1rem` (16px)
- **xl**: `1.5rem` (24px)
- **2xl**: `2rem` (32px)

### Common Patterns
- **Component padding**: `p-3` (12px) or `p-4` (16px)
- **Icon spacing**: `gap-2` (8px) or `gap-3` (12px)
- **Section spacing**: `space-y-4` (16px vertical)

## Component Patterns

### Buttons

#### Primary Button
```css
.btn-primary {
  @apply flex items-center justify-center px-3 py-2 rounded-lg 
         bg-gray-900 hover:bg-gray-800 text-white 
         shadow-sm hover:shadow-md transition-all duration-200;
}
```

#### Secondary Button
```css
.btn-secondary {
  @apply flex items-center justify-center px-3 py-2 rounded-lg 
         bg-white hover:bg-gray-50 text-gray-700 
         border border-gray-200 shadow-sm hover:shadow-md 
         transition-all duration-200;
}
```

#### Icon Button
```css
.btn-icon {
  @apply w-10 h-10 flex items-center justify-center rounded-lg 
         bg-white hover:bg-gray-50 text-gray-700 
         border border-gray-200 shadow-lg hover:shadow-md 
         transition-all duration-200;
}
```

### Icons

#### Standard Sizing
- **Small**: `w-3 h-3` (12px) - For compact buttons
- **Medium**: `w-4 h-4` (16px) - Standard size
- **Large**: `w-5 h-5` (20px) - For headers
- **XL**: `w-6 h-6` (24px) - For prominent elements

#### Icon Containers
```css
.icon-container {
  @apply w-8 h-8 rounded-lg bg-white border border-gray-200 
         flex items-center justify-center shadow-sm;
}
```

### Panels & Sidebars

#### Sidebar Pattern
```css
.sidebar {
  @apply relative h-full bg-gray-50 text-gray-700 
         border-r border-gray-200 transition-all duration-300 ease-in-out;
}

.sidebar-collapsed {
  @apply w-16;
}

.sidebar-expanded {
  @apply w-80;
}
```

#### Panel Header
```css
.panel-header {
  @apply flex items-center gap-2 h-10 px-4 pt-[4.75rem];
}
```

### Forms & Inputs

#### Input Field
```css
.input-field {
  @apply bg-white border border-gray-300 rounded-lg px-3 py-2 
         text-sm placeholder:text-gray-400 
         focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent 
         shadow-sm hover:shadow-md transition-shadow;
}
```

#### Input Container
```css
.input-container {
  @apply flex items-center gap-3 bg-white rounded-lg 
         border border-gray-300 shadow-sm p-3 
         hover:shadow-md transition-shadow 
         focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent;
}
```

### Messages & Chat

#### Message Bubble (User)
```css
.message-user {
  @apply max-w-[75%] rounded-lg px-3 py-2 shadow-sm 
         bg-gray-900 text-white;
}
```

#### Message Bubble (Assistant)
```css
.message-assistant {
  @apply max-w-[75%] rounded-lg px-3 py-2 shadow-sm 
         bg-white border border-gray-200 text-gray-900;
}
```

## Layout Patterns

### Main Application Layout
```jsx
<div className="h-screen w-screen overflow-hidden flex">
  {/* Left Sidebar */}
  <ArchitectureSidebar />
  
  {/* Main Content */}
  <div className="flex-1 overflow-hidden">
    <InteractiveCanvas />
  </div>
  
  {/* Right Panel */}
  <RightPanelChat />
</div>
```

### Collapsible Panel Pattern
```jsx
<div className={`
  relative h-full bg-gray-50 text-gray-700 border-l border-gray-200 
  transition-all duration-300 ease-in-out
  ${isCollapsed ? 'w-16' : 'w-80'}
`}>
  {/* Close button when expanded */}
  {!isCollapsed && (
    <button className="absolute top-4 left-4 z-50 btn-icon">
      <PanelClose className="w-4 h-4" />
    </button>
  )}
  
  {/* Icon bar - always visible */}
  <div className="flex flex-col h-full pt-[4.75rem]">
    <div className="flex flex-col gap-3 px-4">
      {/* Collapsible content */}
    </div>
  </div>
</div>
```

## Animation & Transitions

### Standard Transitions
```css
/* Panel collapse/expand */
transition-all duration-300 ease-in-out

/* Button interactions */
transition-all duration-200

/* Shadow changes */
transition-shadow

/* Hover effects */
hover:shadow-md
```

### Loading States
```jsx
<Loader2 className="w-4 h-4 animate-spin" />
```

## Accessibility

### Focus States
- All interactive elements must have visible focus indicators
- Use `focus:ring-2 focus:ring-blue-500` for form elements
- Ensure keyboard navigation works throughout

### Color Contrast
- Text on white backgrounds: minimum 4.5:1 ratio
- Interactive elements: minimum 3:1 ratio
- Disabled states: clearly distinguishable

### Screen Readers
- All buttons must have descriptive `title` attributes
- Icons should have appropriate `aria-label` when standalone
- Form inputs must have associated labels

## Best Practices

### Component Structure
1. Use consistent prop interfaces
2. Implement proper TypeScript types
3. Follow the collapsible panel pattern for sidebars
4. Use semantic HTML elements

### Styling Guidelines
1. Prefer Tailwind utility classes over custom CSS
2. Use the defined color palette consistently
3. Maintain consistent spacing using the scale
4. Apply shadows consistently: `shadow-sm` for subtle, `shadow-lg` for prominent

### Performance
1. Use `transition-all` sparingly - prefer specific properties
2. Implement proper loading states
3. Optimize for mobile viewports where applicable

## Component Checklist

When creating new components, ensure:
- [ ] Follows the established color palette
- [ ] Uses consistent spacing and typography
- [ ] Implements proper hover and focus states
- [ ] Includes loading and disabled states where applicable
- [ ] Has proper TypeScript interfaces
- [ ] Follows accessibility guidelines
- [ ] Uses semantic HTML structure
- [ ] Implements consistent animation patterns

---

This design system should be referenced for all new components and updated as patterns evolve.
