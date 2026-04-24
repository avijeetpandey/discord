import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

export function createStompClient(token: string): Client {
  return new Client({
    webSocketFactory: () =>
      new SockJS(import.meta.env.VITE_WS_URL ?? 'http://localhost:8080/ws') as WebSocket,
    connectHeaders: {
      Authorization: `Bearer ${token}`,
    },
    reconnectDelay: 5000,
    heartbeatIncoming: 25000,
    heartbeatOutgoing: 25000,
  });
}
