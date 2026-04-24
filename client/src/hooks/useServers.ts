import { useCallback, useEffect, useState } from 'react';
import api from '@/lib/api';
import type { Server, ServerDetail } from '@/types';

function toServer(d: ServerDetail): Server {
  return {
    id: d.id,
    name: d.name,
    iconUrl: d.iconUrl,
    inviteCode: d.inviteCode,
    ownerId: d.owner.id,
    createdAt: d.createdAt,
  };
}

export function useServers() {
  const [servers, setServers] = useState<Server[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<Server[]>('/servers')
      .then(({ data }) => setServers(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const createServer = useCallback(async (name: string): Promise<ServerDetail> => {
    const { data } = await api.post<ServerDetail>('/servers', { name });
    setServers((prev) => [...prev, toServer(data)]);
    return data;
  }, []);

  const joinServer = useCallback(async (inviteCode: string): Promise<ServerDetail> => {
    const { data } = await api.post<ServerDetail>(`/servers/join/${inviteCode}`);
    setServers((prev) => (prev.some((s) => s.id === data.id) ? prev : [...prev, toServer(data)]));
    return data;
  }, []);

  return { servers, loading, createServer, joinServer };
}
