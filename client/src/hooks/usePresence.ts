import { useEffect, useState } from 'react';
import { useSocket } from '@/context/SocketContext';
import type { PresenceEvent } from '@/types';

export function usePresence(serverId: string | undefined) {
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const { client, publish } = useSocket();

  // Subscribe to presence events for this server
  useEffect(() => {
    if (!serverId || !client) return;

    const sub = client.subscribe(`/topic/server/${serverId}/presence`, (frame) => {
      const event: PresenceEvent = JSON.parse(frame.body);
      setOnlineUsers((prev) => {
        const next = new Set(prev);
        if (event.status === 'ONLINE') next.add(event.userId);
        else next.delete(event.userId);
        return next;
      });
    });

    // Announce presence immediately on server selection
    publish('/app/presence/heartbeat', { serverId });

    return () => sub.unsubscribe();
  }, [serverId, client, publish]);

  // Heartbeat every 30 s to keep the Redis TTL alive
  useEffect(() => {
    if (!serverId || !client) return;
    const id = setInterval(() => publish('/app/presence/heartbeat', { serverId }), 30_000);
    return () => clearInterval(id);
  }, [serverId, client, publish]);

  // Reset when changing server
  useEffect(() => {
    setOnlineUsers(new Set());
  }, [serverId]);

  return { onlineUsers };
}
