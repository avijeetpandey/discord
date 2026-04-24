import { Hash } from 'lucide-react';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import { useMessages } from '@/hooks/useMessages';
import type { Channel, User } from '@/types';

interface Props {
  channel: Channel | null;
  currentUser: User | null;
  connected: boolean;
}

export default function ChatArea({ channel, currentUser, connected }: Props) {
  const { messages, loading, hasMore, loadMore, sendMessage, editMessage, deleteMessage } =
    useMessages(channel?.id);

  if (!channel) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center bg-discord-700">
        <p className="text-2xl font-bold text-discord-text-primary">Welcome to Discord Clone</p>
        <p className="mt-2 text-sm text-discord-text-muted">Select a channel to start chatting.</p>
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col overflow-hidden bg-discord-700">
      {/* Channel header */}
      <div className="flex h-12 shrink-0 items-center gap-2 border-b border-discord-900 px-4 shadow-sm">
        <Hash className="h-5 w-5 text-discord-text-muted" />
        <span className="text-sm font-semibold text-white">{channel.name}</span>
      </div>

      {/* Message list */}
      <MessageList
        messages={messages}
        currentUserId={currentUser?.id ?? ''}
        hasMore={hasMore}
        loading={loading}
        onLoadMore={loadMore}
        onEdit={editMessage}
        onDelete={deleteMessage}
      />

      {/* Input */}
      <MessageInput channelName={channel.name} disabled={!connected} onSend={sendMessage} />
    </main>
  );
}
