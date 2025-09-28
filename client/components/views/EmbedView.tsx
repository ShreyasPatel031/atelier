import React from 'react';
import InteractiveCanvas from '../ui/InteractiveCanvas';

interface EmbedViewProps {
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

const EmbedView: React.FC<EmbedViewProps> = (props) => {
  return (
    <InteractiveCanvas
      {...props}
      isPublicMode={true}
      rightPanelCollapsed={true}
    />
  );
};

export default EmbedView;
