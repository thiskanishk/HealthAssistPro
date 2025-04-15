import { useState, useEffect, useCallback, useRef } from 'react';

export interface UseWebSocketOptions {
  onMessage?: (data: any) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
  autoConnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

interface UseWebSocketReturn {
  isConnected: boolean;
  error: Error | null;
  sendMessage: (type: string, data?: any) => void;
  reconnect: () => void;
  disconnect: () => void;
  connect: () => void;
}

export const useWebSocket = (
  url: string,
  options: UseWebSocketOptions = {}
): UseWebSocketReturn => {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef<number>(0);
  const reconnectIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const {
    onMessage,
    onConnect,
    onDisconnect,
    onError,
    autoConnect = true,
    reconnectInterval = 3000,
    maxReconnectAttempts = 5
  } = options;

  // Initialize connection
  const connect = useCallback(() => {
    // Close existing connection if any
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.close();
    }

    try {
      const socket = new WebSocket(url);
      socketRef.current = socket;

      socket.onopen = () => {
        setIsConnected(true);
        setError(null);
        reconnectAttemptsRef.current = 0;
        if (onConnect) onConnect();
      };

      socket.onclose = (event) => {
        setIsConnected(false);
        if (onDisconnect) onDisconnect();
        
        // Attempt to reconnect if not a clean close
        if (!event.wasClean && reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectIntervalRef.current = setTimeout(() => {
            reconnectAttemptsRef.current += 1;
            connect();
          }, reconnectInterval);
        }
      };

      socket.onerror = (event) => {
        const wsError = new Error('WebSocket error');
        setError(wsError);
        if (onError) onError(event);
      };

      socket.onmessage = (event) => {
        try {
          const parsedData = JSON.parse(event.data);
          if (onMessage) onMessage(parsedData);
        } catch (err) {
          console.error('Error parsing WebSocket message:', err);
          if (onMessage) onMessage(event.data);
        }
      };
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to connect to WebSocket');
      setError(error);
      console.error('WebSocket connection error:', error);
    }
  }, [url, onConnect, onDisconnect, onError, onMessage, maxReconnectAttempts, reconnectInterval]);

  // Send message through the socket
  const sendMessage = useCallback((type: string, data?: any) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type, data }));
    } else {
      console.error('Cannot send message: WebSocket is not connected');
    }
  }, []);

  // Manually reconnect
  const reconnect = useCallback(() => {
    reconnectAttemptsRef.current = 0;
    connect();
  }, [connect]);

  // Disconnect and cleanup
  const disconnect = useCallback(() => {
    if (reconnectIntervalRef.current) {
      clearTimeout(reconnectIntervalRef.current);
      reconnectIntervalRef.current = null;
    }

    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }
    
    setIsConnected(false);
  }, []);

  // Connect on mount if autoConnect is true
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    // Cleanup on unmount
    return () => {
      disconnect();
    };
  }, [autoConnect, connect, disconnect]);

  return {
    isConnected,
    error,
    sendMessage,
    reconnect,
    disconnect,
    connect
  };
};

export default useWebSocket;

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