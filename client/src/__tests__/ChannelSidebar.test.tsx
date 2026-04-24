import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { TooltipProvider } from '@/components/ui/tooltip';
import ChannelSidebar from '@/components/layout/ChannelSidebar';
import api from '@/lib/api';
import type { Channel, ServerDetail, User } from '@/types';

vi.mock('@/lib/api', () => ({
  default: {
    post: vi.fn(),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
  },
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

const alice: User = {
  id: 'user-1',
  username: 'alice',
  email: 'alice@test.com',
  avatarUrl: null,
  createdAt: '',
};

const mockDetail: ServerDetail = {
  id: 'srv-1',
  name: 'Rust Devs',
  iconUrl: null,
  inviteCode: 'CODE1',
  owner: alice,
  channels: [
    { id: 'ch-1', serverId: 'srv-1', name: 'general', type: 'TEXT', position: 0, createdAt: '' },
    { id: 'ch-2', serverId: 'srv-1', name: 'random', type: 'TEXT', position: 1, createdAt: '' },
  ],
  members: [
    { id: 'm-1', userId: 'user-1', username: 'alice', avatarUrl: null, role: 'OWNER', joinedAt: '' },
    { id: 'm-2', userId: 'user-2', username: 'bob', avatarUrl: null, role: 'MEMBER', joinedAt: '' },
  ],
  createdAt: '',
};

const defaultProps = {
  serverDetail: mockDetail,
  activeChannelId: 'ch-1',
  currentUser: alice,
  connected: true,
  onChannelCreated: vi.fn(),
  onLogout: vi.fn(),
};

function renderSidebar(props = {}) {
  return render(
    <BrowserRouter>
      <TooltipProvider>
        <ChannelSidebar {...defaultProps} {...props} />
      </TooltipProvider>
    </BrowserRouter>,
  );
}

describe('ChannelSidebar', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders server name in header', () => {
    renderSidebar();
    expect(screen.getByText('Rust Devs')).toBeInTheDocument();
  });

  it('renders all text channels', () => {
    renderSidebar();
    expect(screen.getByText('general')).toBeInTheDocument();
    expect(screen.getByText('random')).toBeInTheDocument();
  });

  it('shows "Select a server" when no serverDetail', () => {
    renderSidebar({ serverDetail: null });
    expect(screen.getByText(/select a server/i)).toBeInTheDocument();
  });

  it('shows create channel button for owner', () => {
    renderSidebar();
    expect(screen.getByRole('button', { name: /create channel/i })).toBeInTheDocument();
  });

  it('hides create channel button for non-owner member', () => {
    const bob: User = { ...alice, id: 'user-2', username: 'bob' };
    renderSidebar({ currentUser: bob });
    expect(screen.queryByRole('button', { name: /create channel/i })).not.toBeInTheDocument();
  });

  it('opens create channel dialog on button click', async () => {
    renderSidebar();
    fireEvent.click(screen.getByRole('button', { name: /create channel/i }));
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());
    expect(screen.getByLabelText(/channel name/i)).toBeInTheDocument();
  });

  it('creates channel, shows toast, and navigates on success', async () => {
    const { toast } = await import('sonner');
    const newChannel: Channel = {
      id: 'ch-3',
      serverId: 'srv-1',
      name: 'new-channel',
      type: 'TEXT',
      position: 2,
      createdAt: '',
    };
    vi.mocked(api.post).mockResolvedValueOnce({ data: newChannel });

    renderSidebar();
    fireEvent.click(screen.getByRole('button', { name: /create channel/i }));
    await waitFor(() => screen.getByRole('dialog'));

    fireEvent.change(screen.getByLabelText(/channel name/i), {
      target: { value: 'new-channel' },
    });
    fireEvent.click(screen.getByRole('button', { name: /create channel/i }));

    await waitFor(() => {
      expect(defaultProps.onChannelCreated).toHaveBeenCalledWith(newChannel);
      expect(toast.success).toHaveBeenCalledWith('Channel #new-channel created!');
      expect(mockNavigate).toHaveBeenCalledWith('/app/srv-1/ch-3');
    });
  });

  it('shows error in dialog when channel creation fails', async () => {
    vi.mocked(api.post).mockRejectedValueOnce(new Error('Network error'));

    renderSidebar();
    fireEvent.click(screen.getByRole('button', { name: /create channel/i }));
    await waitFor(() => screen.getByRole('dialog'));

    fireEvent.change(screen.getByLabelText(/channel name/i), {
      target: { value: 'fail-channel' },
    });
    fireEvent.click(screen.getByRole('button', { name: /create channel/i }));

    await waitFor(() =>
      expect(screen.getByText('Failed to create channel.')).toBeInTheDocument(),
    );
  });

  it('disables create button when channel name is empty', async () => {
    renderSidebar();
    fireEvent.click(screen.getByRole('button', { name: /create channel/i }));
    await waitFor(() => screen.getByRole('dialog'));

    const buttons = screen.getAllByRole('button', { name: /create channel/i });
    const dialogBtn = buttons[buttons.length - 1];
    expect(dialogBtn).toBeDisabled();
  });

  it('shows current user name in user panel', () => {
    renderSidebar();
    expect(screen.getByText('alice')).toBeInTheDocument();
  });

  it('shows Online status when connected', () => {
    renderSidebar();
    expect(screen.getByText('Online')).toBeInTheDocument();
  });

  it('shows Connecting status when disconnected', () => {
    renderSidebar({ connected: false });
    expect(screen.getByText('Connecting…')).toBeInTheDocument();
  });

  it('calls onLogout when logout button clicked', () => {
    renderSidebar();
    fireEvent.click(screen.getByRole('button', { name: /log out/i }));
    expect(defaultProps.onLogout).toHaveBeenCalledOnce();
  });

  it('navigates to channel on click', () => {
    renderSidebar();
    fireEvent.click(screen.getByText('random'));
    expect(mockNavigate).toHaveBeenCalledWith('/app/srv-1/ch-2');
  });
});
