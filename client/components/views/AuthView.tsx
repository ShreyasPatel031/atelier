import React from 'react';
import InteractiveCanvas from '../ui/InteractiveCanvas';

interface AuthViewProps {
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

const AuthView: React.FC<AuthViewProps> = (props) => {
  return (
    <InteractiveCanvas
      {...props}
      isPublicMode={false}
    />
  );
};

export default AuthView;
