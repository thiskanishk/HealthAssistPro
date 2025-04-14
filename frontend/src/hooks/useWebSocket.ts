import { useEffect, useRef, useCallback, useState } from 'react';
import { useAuth } from './useAuth';

interface WebSocketMessage {
  type: string;
  data?: any;
  status?: string;
  message?: string;
}

interface UseWebSocketOptions {
  onMessage?: (message: WebSocketMessage) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;
  autoReconnect?: boolean;
  reconnectAttempts?: number;
  reconnectInterval?: number;
}

export const useWebSocket = (options: UseWebSocketOptions = {}) => {
  const {
    onMessage,
    onConnect,
    onDisconnect,
    onError,
    autoReconnect = true,
    reconnectAttempts = 5,
    reconnectInterval = 5000,
  } = options;

  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const ws = useRef<WebSocket | null>(null);
  const reconnectCount = useRef(0);
  const reconnectTimeout = useRef<NodeJS.Timeout>();

  const connect = useCallback(() => {
    try {
      const token = localStorage.getItem('token');
      if (!token || !user) return;

      const wsUrl = `${process.env.REACT_APP_WS_URL || 'ws://localhost:5000'}/ws?token=${token}`;
      ws.current = new WebSocket(wsUrl);

      ws.current.onopen = () => {
        setIsConnected(true);
        setError(null);
        reconnectCount.current = 0;
        onConnect?.();
      };

      ws.current.onclose = () => {
        setIsConnected(false);
        onDisconnect?.();

        if (autoReconnect && reconnectCount.current < reconnectAttempts) {
          reconnectTimeout.current = setTimeout(() => {
            reconnectCount.current += 1;
            connect();
          }, reconnectInterval);
        }
      };

      ws.current.onerror = (event) => {
        const wsError = new Error('WebSocket error');
        setError(wsError);
        onError?.(wsError);
      };

      ws.current.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          
          if (message.type === 'error') {
            const wsError = new Error(message.message);
            setError(wsError);
            onError?.(wsError);
            return;
          }

          onMessage?.(message);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };
    } catch (error) {
      const wsError = error instanceof Error ? error : new Error('Failed to connect to WebSocket');
      setError(wsError);
      onError?.(wsError);
    }
  }, [user, autoReconnect, reconnectAttempts, reconnectInterval, onConnect, onDisconnect, onError, onMessage]);

  const disconnect = useCallback(() => {
    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
    }

    if (ws.current) {
      ws.current.close();
      ws.current = null;
    }

    setIsConnected(false);
    reconnectCount.current = 0;
  }, []);

  const sendMessage = useCallback((type: string, data?: any) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ type, data }));
    } else {
      const wsError = new Error('WebSocket is not connected');
      setError(wsError);
      onError?.(wsError);
    }
  }, [onError]);

  const reconnect = useCallback(() => {
    disconnect();
    connect();
  }, [disconnect, connect]);

  useEffect(() => {
    connect();
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    isConnected,
    error,
    sendMessage,
    reconnect,
    disconnect
  };
};

// Example usage:
/*
const MyComponent = () => {
  const { isConnected, sendMessage } = useWebSocket({
    onMessage: (message) => {
      switch (message.type) {
        case 'notification':
          handleNotification(message.data);
          break;
        case 'status_update':
          handleStatusUpdate(message.data);
          break;
      }
    },
    onConnect: () => {
      console.log('Connected to WebSocket');
    },
    onError: (error) => {
      console.error('WebSocket error:', error);
    }
  });

  const handleSendMessage = () => {
    sendMessage('chat_message', { text: 'Hello!' });
  };

  return (
    <div>
      <div>Connection status: {isConnected ? 'Connected' : 'Disconnected'}</div>
      <button onClick={handleSendMessage}>Send Message</button>
    </div>
  );
};
*/ 