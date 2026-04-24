import { useEffect, useRef } from 'react';
import MessageItem from './MessageItem';
import type { Message } from '@/types';

interface Props {
  messages: Message[];
  currentUserId: string;
  hasMore: boolean;
  loading: boolean;
  onLoadMore: () => void;
  onEdit: (id: string, content: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export default function MessageList({
  messages,
  currentUserId,
  hasMore,
  loading,
  onLoadMore,
  onEdit,
  onDelete,
}: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isFirstLoad = useRef(true);

  // Auto-scroll to bottom on initial load and new messages
  useEffect(() => {
    if (messages.length === 0) {
      isFirstLoad.current = true;
      return;
    }
    if (isFirstLoad.current) {
      bottomRef.current?.scrollIntoView();
      isFirstLoad.current = false;
      return;
    }
    // Only auto-scroll if user is near the bottom
    const el = containerRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (distanceFromBottom < 150) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Load more when scrolled to top — restore scroll position after prepend
  function handleScroll() {
    const el = containerRef.current;
    if (!el || loading || !hasMore) return;
    if (el.scrollTop < 100) {
      const prevHeight = el.scrollHeight;
      onLoadMore();
      requestAnimationFrame(() => {
        el.scrollTop = el.scrollHeight - prevHeight;
      });
    }
  }

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="flex flex-1 flex-col overflow-y-auto py-4"
    >
      {hasMore && (
        <div className="py-2 text-center">
          {loading ? (
            <span className="text-xs text-discord-text-muted">Loading…</span>
          ) : (
            <button onClick={onLoadMore} className="text-xs text-discord-brand hover:underline">
              Load older messages
            </button>
          )}
        </div>
      )}

      {messages.length === 0 && !loading && (
        <div className="flex flex-1 items-end px-4 pb-2">
          <p className="text-sm text-discord-text-muted">
            This is the beginning of the channel history.
          </p>
        </div>
      )}

      {messages.map((msg, i) => {
        const prev = messages[i - 1];
        const showHeader =
          !prev ||
          prev.author.id !== msg.author.id ||
          new Date(msg.createdAt).getTime() - new Date(prev.createdAt).getTime() > 5 * 60 * 1000;
        return (
          <MessageItem
            key={msg.id}
            message={msg}
            isOwn={msg.author.id === currentUserId}
            showHeader={showHeader}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        );
      })}

      <div ref={bottomRef} />
    </div>
  );
}
