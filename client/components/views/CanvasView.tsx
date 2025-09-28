import React from 'react';
import InteractiveCanvas from '../ui/InteractiveCanvas';

interface CanvasViewProps {
  isSessionActive?: boolean;
  isConnecting?: boolean;
  isAgentReady?: boolean;
  startSession?: () => void;
  stopSession?: () => void;
  sendTextMessage?: (message: string) => void;
  sendClientEvent?: (event: any) => void;
  events?: any[];
  apiEndpoint?: string;
  isPublicMode?: boolean;
  rightPanelCollapsed?: boolean;
}

const CanvasView: React.FC<CanvasViewProps> = (props) => {
  return (
    <InteractiveCanvas
      {...props}
      isPublicMode={true}
      rightPanelCollapsed={false}
    />
  );
};

export default CanvasView;
