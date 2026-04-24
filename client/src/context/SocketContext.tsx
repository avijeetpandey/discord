import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Client, type IMessage } from '@stomp/stompjs';
import { createStompClient } from '@/lib/socket';
import { useAuth } from '@/context/AuthContext';

interface SocketContextType {
  client: Client | null;
  connected: boolean;
  subscribe: (destination: string, callback: (msg: IMessage) => void) => () => void;
  publish: (destination: string, body: object) => void;
}

const SocketContext = createContext<SocketContextType>({
  client: null,
  connected: false,
  subscribe: () => () => {},
  publish: () => {},
});

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { token, isAuthenticated } = useAuth();
  const [client, setClient] = useState<Client | null>(null);
  const [connected, setConnected] = useState(false);
  const clientRef = useRef<Client | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !token) {
      if (clientRef.current) {
        clientRef.current.deactivate();
        clientRef.current = null;
        setClient(null);
        setConnected(false);
      }
      return;
    }

    const stompClient = createStompClient(token);
    stompClient.onConnect = () => {
      setConnected(true);
      setClient(stompClient);
    };
    stompClient.onDisconnect = () => {
      setConnected(false);
    };
    stompClient.onStompError = (frame) => {
      console.error('STOMP error:', frame.headers['message']);
    };

    stompClient.activate();
    clientRef.current = stompClient;

    return () => {
      stompClient.deactivate();
      clientRef.current = null;
      setConnected(false);
    };
  }, [isAuthenticated, token]);

  const subscribe = useCallback(
    (destination: string, callback: (msg: IMessage) => void): (() => void) => {
      if (!client?.connected) return () => {};
      const sub = client.subscribe(destination, callback);
      return () => sub.unsubscribe();
    },
    [client],
  );

  const publish = useCallback(
    (destination: string, body: object): void => {
      if (!client?.connected) return;
      client.publish({ destination, body: JSON.stringify(body) });
    },
    [client],
  );

  return (
    <SocketContext.Provider value={{ client, connected, subscribe, publish }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket(): SocketContextType {
  return useContext(SocketContext);
}
