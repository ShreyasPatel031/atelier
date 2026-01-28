# Viewer Migration Guide: Old → New Data Structure

## Overview

This document describes how to migrate the existing `viewer.html` to work with the **new structured diagram format** stored in `module_tree.json`.

---

## Data Structure Changes

### OLD Structure (module_tree.json)
```json
{
  "operator": {
    "path": "operator",
    "components": ["component.id.1", "component.id.2"],
    "children": {
      "controller": { ... }
    }
  }
}
```
- **No diagram data** - diagrams were raw Mermaid in `.md` files
- **No title/description** - had to parse from markdown headers

### NEW Structure (module_tree.json)
```json
{
  "operator": {
    "title": "Operator Module",
    "description": "Manages Kubernetes CRDs and reconciliation loops.",
    "components": ["component.id.1", "component.id.2"],
    "diagram": {
      "direction": "TD",
      "nodes": [
        {"id": "controller", "label": "Controller", "type": "module", "link": "controller.md"},
        {"id": "informer", "label": "Informer", "type": "module", "link": "informer.md"},
        {"id": "k8s_client", "label": "K8s Client", "type": "external", "link": null}
      ],
      "edges": [
        {"source": "controller", "target": "informer"},
        {"source": "controller", "target": "k8s_client", "label": "API calls"}
      ],
      "groups": []
    },
    "children": {
      "controller": { ... },
      "informer": { ... }
    }
  }
}
```

---

## Key Changes for Viewer

### 1. Title & Description (Hover Tooltips)

**Location in new structure:**
```javascript
module.title       // e.g., "Operator Module"
module.description // e.g., "Manages Kubernetes CRDs..."
```

**Implementation:**
- On node hover → show tooltip with `title` and `description`
- CSS: Use `::before` pseudo-element or dedicated tooltip div

### 2. Diagram Rendering

**OLD:** Parse Mermaid from `.md` file, render with mermaid.js
```javascript
// OLD approach
const mdContent = await fetch(`${module}.md`).then(r => r.text());
const mermaidMatch = mdContent.match(/```mermaid\n([\s\S]*?)```/);
mermaid.render('diagram', mermaidMatch[1]);
```

**NEW:** Use structured `diagram` object directly
```javascript
// NEW approach
const diagram = module.diagram;
const mermaidCode = convertToMermaid(diagram);
mermaid.render('diagram', mermaidCode);

function convertToMermaid(diagram) {
  let code = `graph ${diagram.direction}\n`;
  
  // Add nodes
  for (const node of diagram.nodes) {
    code += `    ${node.id}[${node.label}]\n`;
  }
  
  // Add edges
  for (const edge of diagram.edges) {
    const label = edge.label ? `|${edge.label}|` : '';
    code += `    ${edge.source} -->${label} ${edge.target}\n`;
  }
  
  // Add click handlers for module nodes
  for (const node of diagram.nodes) {
    if (node.type === 'module' && node.link) {
      code += `    click ${node.id} "${node.link}"\n`;
    }
  }
  
  return code;
}
```

### 3. Node Types & Styling

**Node types in new structure:**
| Type | Meaning | Clickable | Color |
|------|---------|-----------|-------|
| `module` | Sub-module with docs | ✅ Yes | Blue |
| `component` | Internal component | ❌ No | Gray |
| `external` | External dependency | ❌ No | Light gray |

**CSS classes to add:**
```css
.node-module { fill: #4a90d9; cursor: pointer; }
.node-component { fill: #6c757d; }
.node-external { fill: #adb5bd; }
```

**Apply after Mermaid render:**
```javascript
function styleNodes(diagram) {
  for (const node of diagram.nodes) {
    const el = document.querySelector(`[id*="${node.id}"]`);
    if (el) {
      el.classList.add(`node-${node.type}`);
    }
  }
}
```

### 4. Right Panel (Closed by Default)

**OLD:** Right panel always visible
**NEW:** Right panel closed by default, opens on node click

```css
/* Default: closed */
#right-panel {
  width: 0;
  overflow: hidden;
  transition: width 0.3s ease;
}

#right-panel.open {
  width: 400px;
}
```

```javascript
function toggleDocPanel(show) {
  const panel = document.getElementById('right-panel');
  if (show) {
    panel.classList.add('open');
  } else {
    panel.classList.remove('open');
  }
}

// On node click
function onNodeClick(nodeId, module) {
  const node = module.diagram.nodes.find(n => n.id === nodeId);
  if (node && node.type === 'module') {
    loadModuleContent(node.link);
    toggleDocPanel(true);
  }
}
```

### 5. Hover Tooltip Implementation

```javascript
function setupHoverTooltips(moduleTree) {
  const tooltip = document.createElement('div');
  tooltip.id = 'module-tooltip';
  tooltip.style.cssText = `
    position: absolute;
    background: #1a1a2e;
    border: 1px solid #4a90d9;
    border-radius: 8px;
    padding: 12px;
    max-width: 300px;
    display: none;
    z-index: 1000;
  `;
  document.body.appendChild(tooltip);
  
  // Add listeners to all module nodes
  document.querySelectorAll('.node-module').forEach(el => {
    const nodeId = extractNodeId(el);
    const module = findModuleByNodeId(moduleTree, nodeId);
    
    el.addEventListener('mouseenter', (e) => {
      tooltip.innerHTML = `
        <strong>${module.title}</strong>
        <p style="margin: 8px 0 0; color: #a0a0a0;">${module.description}</p>
      `;
      tooltip.style.left = `${e.pageX + 10}px`;
      tooltip.style.top = `${e.pageY + 10}px`;
      tooltip.style.display = 'block';
    });
    
    el.addEventListener('mouseleave', () => {
      tooltip.style.display = 'none';
    });
  });
}
```

---

## Migration Checklist

- [ ] **Data loading:** Load `module_tree.json` instead of parsing `.md` files for diagram
- [ ] **Diagram rendering:** Use `convertToMermaid(module.diagram)` instead of regex extraction
- [ ] **Node styling:** Apply `node-module`, `node-component`, `node-external` classes
- [ ] **Hover tooltips:** Show `title` and `description` on node hover
- [ ] **Right panel:** Start closed, open on node click
- [ ] **Click handling:** Only `type: "module"` nodes are clickable
- [ ] **Breadcrumbs:** Update to use `title` instead of module name

---

## File Locations

| File | Purpose |
|------|---------|
| `demo/viewer.html` | Main viewer - needs migration |
| `demo/repos/KubeElasti/module_tree.json` | **NEW FORMAT DATA** - use this! |
| `codewiki/src/be/diagram_schema.py` | Python schema for diagram IR |
| `codewiki/src/be/validation.py` | Validation for new structure |

### IMPORTANT: Data Location

The **NEW format** data is in:
```
/Users/shreyaspatel/atelier/demo/repos/KubeElasti/module_tree.json
```

This has:
- ✅ `title` field
- ✅ `description` field  
- ✅ `diagram` object with `nodes`, `edges`, `groups`

**DO NOT** use data from `test_repos/` - that's the source. The `demo/repos/` is where the viewer reads from.

---

## Testing

After migration, test with:
```bash
cd /Users/shreyaspatel/atelier
python -m http.server 8080

# Open: http://localhost:8080/demo/viewer.html?repo=KubeElasti
```

Verify:
1. Hover on node → tooltip shows title + description
2. Click on blue node → right panel opens with docs
3. Click outside/close → panel closes
4. Gray nodes are not clickable
5. Breadcrumbs show proper titles
