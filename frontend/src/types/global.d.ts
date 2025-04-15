declare module '@mui/material';
declare module '@mui/icons-material';
declare module '@mui/x-date-pickers/*';
declare module 'date-fns';
import { NotificationContextType } from './notifications';

interface Window {
  webkitRTCPeerConnection: RTCPeerConnection;
  mozRTCPeerConnection: RTCPeerConnection;
  notifications: NotificationContextType;
}

declare namespace JSX {
  interface IntrinsicElements {
    'option': React.DetailedHTMLProps<React.OptionHTMLAttributes<HTMLOptionElement>, HTMLOptionElement>;
    'iframe': React.DetailedHTMLProps<React.IframeHTMLAttributes<HTMLIFrameElement>, HTMLIFrameElement>;
  }
}

// Add type declarations for the useAuth hook
declare module '../../hooks/useAuth' {
  interface User {
    id: string;
    role: 'patient' | 'doctor' | 'admin';
    name: string;
  }

  interface AuthContextType {
    user: User;
    login: (credentials: { email: string; password: string }) => Promise<void>;
    logout: () => void;
  }

  export function useAuth(): AuthContextType;
}

declare global {
  interface Window {
    notifications: NotificationContextType;
  }

  // Add any other global type augmentations here
  namespace NodeJS {
    interface ProcessEnv {
      REACT_APP_API_URL: string;
      REACT_APP_WS_URL: string;
      NODE_ENV: 'development' | 'production' | 'test';
    }
  }
}

export {}; 