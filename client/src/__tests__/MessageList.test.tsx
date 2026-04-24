import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import MessageList from '@/components/chat/MessageList';
import type { Message } from '@/types';

const makeMessage = (id: string, authorId = 'user-1', content = `Message ${id}`): Message => ({
  id,
  channelId: 'ch-1',
  content,
  edited: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  author: {
    id: authorId,
    username: authorId === 'user-1' ? 'alice' : 'bob',
    email: `${authorId}@test.com`,
    avatarUrl: null,
    createdAt: '',
  },
});

const defaultProps = {
  messages: [] as Message[],
  currentUserId: 'user-1',
  hasMore: false,
  loading: false,
  onLoadMore: vi.fn(),
  onEdit: vi.fn(),
  onDelete: vi.fn(),
};

describe('MessageList', () => {
  it('shows empty state when no messages', () => {
    render(<MessageList {...defaultProps} />);
    expect(screen.getByText(/beginning of the channel history/i)).toBeInTheDocument();
  });

  it('renders message content', () => {
    render(
      <MessageList
        {...defaultProps}
        messages={[makeMessage('1'), makeMessage('2')]}
      />,
    );
    expect(screen.getByText('Message 1')).toBeInTheDocument();
    expect(screen.getByText('Message 2')).toBeInTheDocument();
  });

  it('shows "Load older messages" when hasMore=true and not loading', () => {
    render(<MessageList {...defaultProps} hasMore={true} messages={[makeMessage('1')]} />);
    expect(screen.getByRole('button', { name: /load older messages/i })).toBeInTheDocument();
  });

  it('shows "Loading…" text instead of load button when loading=true', () => {
    render(<MessageList {...defaultProps} hasMore={true} loading={true} messages={[makeMessage('1')]} />);
    expect(screen.getByText('Loading…')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /load older messages/i })).not.toBeInTheDocument();
  });

  it('calls onLoadMore when Load button clicked', () => {
    render(
      <MessageList
        {...defaultProps}
        hasMore={true}
        messages={[makeMessage('1')]}
        onLoadMore={defaultProps.onLoadMore}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /load older messages/i }));
    expect(defaultProps.onLoadMore).toHaveBeenCalledOnce();
  });

  it('shows header for first message from new author', () => {
    const msgs = [makeMessage('1', 'user-1'), makeMessage('2', 'user-2')];
    render(<MessageList {...defaultProps} messages={msgs} />);
    expect(screen.getByText('alice')).toBeInTheDocument();
    expect(screen.getByText('bob')).toBeInTheDocument();
  });

  it('does not show empty state when loading', () => {
    render(<MessageList {...defaultProps} loading={true} />);
    expect(screen.queryByText(/beginning of the channel history/i)).not.toBeInTheDocument();
  });

  it('does not show load older button when hasMore=false', () => {
    render(<MessageList {...defaultProps} hasMore={false} messages={[makeMessage('1')]} />);
    expect(screen.queryByRole('button', { name: /load older messages/i })).not.toBeInTheDocument();
  });
});
