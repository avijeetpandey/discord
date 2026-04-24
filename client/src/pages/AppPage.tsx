import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { TooltipProvider } from '@/components/ui/tooltip';
import ServerSidebar from '@/components/layout/ServerSidebar';
import ChannelSidebar from '@/components/layout/ChannelSidebar';
import MembersList from '@/components/layout/MembersList';
import ChatArea from '@/components/chat/ChatArea';
import { useAuth } from '@/context/AuthContext';
import { useSocket } from '@/context/SocketContext';
import { useServers } from '@/hooks/useServers';
import { usePresence } from '@/hooks/usePresence';
import api from '@/lib/api';
import type { Channel, ServerDetail } from '@/types';

export default function AppPage() {
  const { serverId, channelId } = useParams<{ serverId?: string; channelId?: string }>();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { connected } = useSocket();
  const { servers, createServer, joinServer } = useServers();
  const { onlineUsers } = usePresence(serverId);

  const [serverDetail, setServerDetail] = useState<ServerDetail | null>(null);
  const [, setLoadingDetail] = useState(false);

  // Load server detail whenever serverId changes
  useEffect(() => {
    if (!serverId) {
      setServerDetail(null);
      return;
    }
    setLoadingDetail(true);
    api
      .get<ServerDetail>(`/servers/${serverId}`)
      .then(({ data }) => {
        setServerDetail(data);
        // Auto-navigate to first text channel if none selected
        if (!channelId && data.channels.length > 0) {
          const first = data.channels
            .filter((c) => c.type === 'TEXT')
            .sort((a, b) => a.position - b.position)[0];
          if (first) navigate(`/app/${serverId}/${first.id}`, { replace: true });
        }
      })
      .catch(() => {})
      .finally(() => setLoadingDetail(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverId]);

  const activeChannel = serverDetail?.channels.find((c) => c.id === channelId) ?? null;

  function handleChannelCreated(channel: Channel) {
    setServerDetail((prev) => (prev ? { ...prev, channels: [...prev.channels, channel] } : prev));
  }

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex h-screen overflow-hidden bg-discord-700">
        <ServerSidebar
          servers={servers}
          activeServerId={serverId}
          onCreateServer={createServer}
          onJoinServer={joinServer}
        />

        <ChannelSidebar
          serverDetail={serverDetail}
          activeChannelId={channelId}
          currentUser={user}
          connected={connected}
          onChannelCreated={handleChannelCreated}
          onLogout={handleLogout}
        />

        <ChatArea channel={activeChannel} currentUser={user} connected={connected} />

        {serverDetail && <MembersList members={serverDetail.members} onlineUsers={onlineUsers} />}
      </div>
    </TooltipProvider>
  );
}
