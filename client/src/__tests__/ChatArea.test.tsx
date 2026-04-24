import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ChatArea from '@/components/chat/ChatArea';
import { useMessages } from '@/hooks/useMessages';
import type { Channel, Message, User } from '@/types';

vi.mock('@/hooks/useMessages');
vi.mock('@/context/SocketContext', () => ({
  useSocket: () => ({ client: null, connected: false, subscribe: vi.fn(), publish: vi.fn() }),
}));

const alice: User = {
  id: 'user-1',
  username: 'alice',
  email: 'alice@test.com',
  avatarUrl: null,
  createdAt: '',
};

const generalChannel: Channel = {
  id: 'ch-1',
  serverId: 'srv-1',
  name: 'general',
  type: 'TEXT',
  position: 0,
  createdAt: '',
};

const defaultHookReturn = {
  messages: [] as Message[],
  loading: false,
  hasMore: false,
  loadMore: vi.fn(),
  sendMessage: vi.fn(),
  editMessage: vi.fn(),
  deleteMessage: vi.fn(),
};

describe('ChatArea', () => {
  beforeEach(() => {
    vi.mocked(useMessages).mockReturnValue(defaultHookReturn);
  });

  it('shows welcome screen when no channel selected', () => {
    render(<ChatArea channel={null} currentUser={alice} connected={false} />);
    expect(screen.getByText(/welcome to discord clone/i)).toBeInTheDocument();
    expect(screen.getByText(/select a channel/i)).toBeInTheDocument();
  });

  it('renders channel header with channel name', () => {
    render(<ChatArea channel={generalChannel} currentUser={alice} connected={true} />);
    expect(screen.getByText('general')).toBeInTheDocument();
  });

  it('renders message input with correct placeholder', () => {
    render(<ChatArea channel={generalChannel} currentUser={alice} connected={true} />);
    expect(screen.getByPlaceholderText('Message #general')).toBeInTheDocument();
  });

  it('renders message input as disabled when disconnected', () => {
    render(<ChatArea channel={generalChannel} currentUser={alice} connected={false} />);
    expect(screen.getByPlaceholderText('Connecting…')).toBeDisabled();
  });

  it('shows empty channel history message when no messages', () => {
    render(<ChatArea channel={generalChannel} currentUser={alice} connected={true} />);
    expect(screen.getByText(/beginning of the channel history/i)).toBeInTheDocument();
  });

  it('renders messages from useMessages hook', () => {
    const message: Message = {
      id: 'msg-1',
      channelId: 'ch-1',
      content: 'Test message from hook',
      edited: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      author: alice,
    };
    vi.mocked(useMessages).mockReturnValueOnce({ ...defaultHookReturn, messages: [message] });

    render(<ChatArea channel={generalChannel} currentUser={alice} connected={true} />);
    expect(screen.getByText('Test message from hook')).toBeInTheDocument();
  });

  it('shows loading indicator when messages are loading', () => {
    vi.mocked(useMessages).mockReturnValueOnce({
      ...defaultHookReturn,
      hasMore: true,
      loading: true,
      messages: [
        {
          id: 'msg-1',
          channelId: 'ch-1',
          content: 'Hello',
          edited: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          author: alice,
        },
      ],
    });

    render(<ChatArea channel={generalChannel} currentUser={alice} connected={true} />);
    expect(screen.getByText('Loading…')).toBeInTheDocument();
  });
});
