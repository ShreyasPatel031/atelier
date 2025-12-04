import React from "react";
import * as Lucide from "lucide-react";
import { Tool } from '../../hooks/useToolSelection';

export interface CanvasToolbarProps {
  selectedTool: Tool;
  onSelect: (tool: Tool) => void;
  className?: string;
}

const BAR_HEIGHT = 40; // Figma: total bar height 40
// Exact selected blue from Figma design
const BLUE_HEX = "#4285F4";

// Button wrapper exactly 24x24 with 4px inner padding (icon fits container)
const baseBtn =
  "flex items-center justify-center w-6 h-6 rounded-md transition-colors p-1"; // w-6/h-6 = 24px, p-1 = 4px

// Unselected: no border, white bg, subtle hover
const unselected = "bg-white text-gray-700 hover:bg-gray-50 active:bg-gray-100";
// Selected: solid brand blue, white icon
const selectedStyle = "text-white";

// Icon mappings with graceful fallbacks across lucide versions - defined once outside component
const SelectIcon = (Lucide as any).MousePointer2 || (Lucide as any).MousePointer;
const BoxIcon = (Lucide as any).Square || (Lucide as any).RectangleHorizontal || (Lucide as any).RectangleVertical;
const ConnectorIcon = (Lucide as any).Spline || (Lucide as any).BezierCurve;
const GroupIcon = (Lucide as any).Scan || (Lucide as any).RectangleDashed || (Lucide as any).SquareDashed;

// ToolButton component defined OUTSIDE CanvasToolbar to prevent re-mounting on every render
interface ToolButtonProps {
  tool: Tool;
  title: string;
  isSelected: boolean;
  onSelect: (tool: Tool) => void;
  children: React.ReactNode;
}

const ToolButton: React.FC<ToolButtonProps> = React.memo(({ tool, title, isSelected, onSelect, children }) => (
  <button
    type="button"
    aria-label={title}
    title={title}
    onMouseDown={(e) => {
      // Fire tool switch ASAP (before ReactFlow mouseup/select handlers)
      e.stopPropagation();
      e.preventDefault();
      onSelect(tool);
    }}
    onClick={() => {
      onSelect(tool);
    }}
    className={`${baseBtn} ${isSelected ? selectedStyle : unselected}`}
    style={isSelected ? { backgroundColor: BLUE_HEX } : undefined}
  >
    <div className="flex items-center justify-center w-full h-full">
      {children}
    </div>
  </button>
));

ToolButton.displayName = 'ToolButton';

const CanvasToolbar: React.FC<CanvasToolbarProps> = ({ selectedTool, onSelect, className }) => {
  return (
    <div
      className={`flex items-center bg-white/90 backdrop-blur-sm rounded-lg border border-gray-200 shadow-sm ${className || ""}`}
      style={{ height: BAR_HEIGHT, width: 160, paddingLeft: 16, paddingRight: 16, gap: 8 }}
    >
      {/* Select tool (left group) */}
      <ToolButton tool="select" title="Select (V)" isSelected={selectedTool === 'select'} onSelect={onSelect}>
        {SelectIcon ? <SelectIcon className="w-5 h-5" /> : null}
      </ToolButton>

      {/* Divider between select and the other three */}
      <div
        className="h-6"
        style={{ width: 0, borderLeft: '1px solid #e5e7eb' }}
      />

      {/* Box / Connector / Group (right items) */}
      <ToolButton tool="box" title="Add box (R)" isSelected={selectedTool === 'box'} onSelect={onSelect}>
        {BoxIcon ? <BoxIcon className="w-full h-full" /> : null}
      </ToolButton>
      <ToolButton tool="connector" title="Add connector (C)" isSelected={selectedTool === 'connector'} onSelect={onSelect}>
        {ConnectorIcon ? <ConnectorIcon className="w-full h-full" /> : null}
      </ToolButton>
      <ToolButton tool="group" title="Create group (G)" isSelected={selectedTool === 'group'} onSelect={onSelect}>
        {GroupIcon ? <GroupIcon className="w-full h-full" /> : null}
      </ToolButton>
    </div>
  );
};

export default CanvasToolbar;


