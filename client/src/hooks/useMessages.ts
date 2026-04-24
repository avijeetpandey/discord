import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { useSocket } from '@/context/SocketContext';
import type { ChatMessageEvent, Message } from '@/types';

export function useMessages(channelId: string | undefined) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const { client } = useSocket();

  // Initial load whenever channelId changes
  useEffect(() => {
    if (!channelId) {
      setMessages([]);
      setHasMore(true);
      return;
    }
    setLoading(true);
    setMessages([]);
    api
      .get<Message[]>(`/channels/${channelId}/messages?limit=50`)
      .then(({ data }) => {
        setMessages(data);
        setHasMore(data.length === 50);
      })
      .catch(() => toast.error('Failed to load messages.'))
      .finally(() => setLoading(false));
  }, [channelId]);

  // Real-time subscription — re-subscribes whenever channelId or client changes
  useEffect(() => {
    if (!channelId || !client) return;

    const sub = client.subscribe(`/topic/channel/${channelId}`, (frame) => {
      const event: ChatMessageEvent = JSON.parse(frame.body);
      setMessages((prev) => {
        switch (event.type) {
          case 'MESSAGE_CREATE':
            return prev.some((m) => m.id === event.message.id) ? prev : [...prev, event.message];
          case 'MESSAGE_UPDATE':
            return prev.map((m) => (m.id === event.message.id ? event.message : m));
          case 'MESSAGE_DELETE':
            return prev.filter((m) => m.id !== event.message.id);
          default:
            return prev;
        }
      });
    });

    return () => sub.unsubscribe();
  }, [channelId, client]);

  const loadMore = useCallback(async () => {
    if (!channelId || !hasMore || loading || messages.length === 0) return;
    const oldest = messages[0];
    const { data } = await api.get<Message[]>(
      `/channels/${channelId}/messages?before=${oldest.id}&limit=50`,
    );
    setMessages((prev) => [...data, ...prev]);
    setHasMore(data.length === 50);
  }, [channelId, hasMore, loading, messages]);

  const sendMessage = useCallback(
    (content: string) => {
      if (!client || !channelId) return;
      client.publish({
        destination: `/app/channel/${channelId}/send`,
        body: JSON.stringify({ content }),
      });
    },
    [client, channelId],
  );

  const editMessage = useCallback(
    async (messageId: string, content: string) => {
      if (!channelId) return;
      const { data } = await api.put<Message>(`/channels/${channelId}/messages/${messageId}`, {
        content,
      });
      setMessages((prev) => prev.map((m) => (m.id === messageId ? data : m)));
    },
    [channelId],
  );

  const deleteMessage = useCallback(
    async (messageId: string) => {
      if (!channelId) return;
      await api.delete(`/channels/${channelId}/messages/${messageId}`);
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
    },
    [channelId],
  );

  return { messages, loading, hasMore, loadMore, sendMessage, editMessage, deleteMessage };
}
