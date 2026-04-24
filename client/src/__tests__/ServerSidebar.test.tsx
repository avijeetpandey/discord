import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { TooltipProvider } from '@/components/ui/tooltip';
import ServerSidebar from '@/components/layout/ServerSidebar';
import type { Server, ServerDetail } from '@/types';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

const mockServers: Server[] = [
  {
    id: 'srv-1',
    name: 'Rust Devs',
    iconUrl: null,
    inviteCode: 'CODE1',
    ownerId: 'user-1',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'srv-2',
    name: 'TypeScript Guild',
    iconUrl: null,
    inviteCode: 'CODE2',
    ownerId: 'user-1',
    createdAt: new Date().toISOString(),
  },
];

const mockDetail: ServerDetail = {
  id: 'srv-new',
  name: 'New Server',
  iconUrl: null,
  inviteCode: 'NEWCODE',
  owner: { id: 'user-1', username: 'alice', email: 'a@a.com', avatarUrl: null, createdAt: '' },
  channels: [
    { id: 'ch-1', serverId: 'srv-new', name: 'general', type: 'TEXT', position: 0, createdAt: '' },
  ],
  members: [
    {
      id: 'm-1',
      userId: 'user-1',
      username: 'alice',
      avatarUrl: null,
      role: 'OWNER',
      joinedAt: '',
    },
  ],
  createdAt: '',
};

const defaultProps = {
  servers: mockServers,
  activeServerId: 'srv-1',
  onCreateServer: vi.fn(),
  onJoinServer: vi.fn(),
};

function renderSidebar(props = {}) {
  return render(
    <BrowserRouter>
      <TooltipProvider>
        <ServerSidebar {...defaultProps} {...props} />
      </TooltipProvider>
    </BrowserRouter>,
  );
}

describe('ServerSidebar', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders all server icons', () => {
    renderSidebar();
    expect(screen.getByText('RU')).toBeInTheDocument();
    expect(screen.getByText('TY')).toBeInTheDocument();
  });

  it('renders Add a Server button', () => {
    renderSidebar();
    const addBtn = screen.getByRole('button', { name: /add a server/i });
    expect(addBtn).toBeInTheDocument();
  });

  it('opens create server dialog when Add button clicked', async () => {
    renderSidebar();
    fireEvent.click(screen.getByRole('button', { name: /add a server/i }));
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());
    expect(screen.getByLabelText(/server name/i)).toBeInTheDocument();
  });

  it('calls onCreateServer and navigates on success', async () => {
    const { toast } = await import('sonner');
    defaultProps.onCreateServer.mockResolvedValueOnce(mockDetail);

    renderSidebar();
    fireEvent.click(screen.getByRole('button', { name: /add a server/i }));

    await waitFor(() => screen.getByLabelText(/server name/i));
    fireEvent.change(screen.getByLabelText(/server name/i), {
      target: { value: 'New Server' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^create$/i }));

    await waitFor(() => {
      expect(defaultProps.onCreateServer).toHaveBeenCalledWith('New Server');
      expect(toast.success).toHaveBeenCalledWith('Server "New Server" created!');
      expect(mockNavigate).toHaveBeenCalledWith('/app/srv-new');
    });
  });

  it('shows error in dialog when create fails', async () => {
    defaultProps.onCreateServer.mockRejectedValueOnce(new Error('Server error'));

    renderSidebar();
    fireEvent.click(screen.getByRole('button', { name: /add a server/i }));

    await waitFor(() => screen.getByLabelText(/server name/i));
    fireEvent.change(screen.getByLabelText(/server name/i), {
      target: { value: 'Bad Server' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^create$/i }));

    await waitFor(() =>
      expect(screen.getByText('Failed to create server.')).toBeInTheDocument(),
    );
  });

  it('disables create button when name is empty', async () => {
    renderSidebar();
    fireEvent.click(screen.getByRole('button', { name: /add a server/i }));
    await waitFor(() => screen.getByRole('dialog'));
    expect(screen.getByRole('button', { name: /^create$/i })).toBeDisabled();
  });

  it('switches to join dialog via "Join instead" button', async () => {
    renderSidebar();
    fireEvent.click(screen.getByRole('button', { name: /add a server/i }));
    await waitFor(() => screen.getByRole('dialog'));
    fireEvent.click(screen.getByRole('button', { name: /join instead/i }));
    await waitFor(() => expect(screen.getByLabelText(/invite code/i)).toBeInTheDocument());
  });

  it('calls onJoinServer and navigates on success', async () => {
    const { toast } = await import('sonner');
    defaultProps.onJoinServer.mockResolvedValueOnce(mockDetail);

    renderSidebar();
    fireEvent.click(screen.getByRole('button', { name: /add a server/i }));
    await waitFor(() => screen.getByRole('dialog'));
    fireEvent.click(screen.getByRole('button', { name: /join instead/i }));

    await waitFor(() => screen.getByLabelText(/invite code/i));
    fireEvent.change(screen.getByLabelText(/invite code/i), { target: { value: 'NEWCODE' } });
    fireEvent.click(screen.getByRole('button', { name: /^join$/i }));

    await waitFor(() => {
      expect(defaultProps.onJoinServer).toHaveBeenCalledWith('NEWCODE');
      expect(toast.success).toHaveBeenCalledWith('Joined "New Server"!');
      expect(mockNavigate).toHaveBeenCalledWith('/app/srv-new');
    });
  });

  it('shows 409 already-member error in dialog', async () => {
    defaultProps.onJoinServer.mockRejectedValueOnce(
      Object.assign(new Error('Conflict'), {
        isAxiosError: true,
        response: { status: 409 },
      }),
    );

    renderSidebar();
    fireEvent.click(screen.getByRole('button', { name: /add a server/i }));
    await waitFor(() => screen.getByRole('dialog'));
    fireEvent.click(screen.getByRole('button', { name: /join instead/i }));

    await waitFor(() => screen.getByLabelText(/invite code/i));
    fireEvent.change(screen.getByLabelText(/invite code/i), { target: { value: 'TAKEN' } });
    fireEvent.click(screen.getByRole('button', { name: /^join$/i }));

    await waitFor(() =>
      expect(
        screen.getByText('You are already a member of this server.'),
      ).toBeInTheDocument(),
    );
  });

  it('shows generic error for invalid invite code', async () => {
    defaultProps.onJoinServer.mockRejectedValueOnce(new Error('Not found'));

    renderSidebar();
    fireEvent.click(screen.getByRole('button', { name: /add a server/i }));
    await waitFor(() => screen.getByRole('dialog'));
    fireEvent.click(screen.getByRole('button', { name: /join instead/i }));

    await waitFor(() => screen.getByLabelText(/invite code/i));
    fireEvent.change(screen.getByLabelText(/invite code/i), { target: { value: 'BADCODE' } });
    fireEvent.click(screen.getByRole('button', { name: /^join$/i }));

    await waitFor(() => expect(screen.getByText('Invalid invite code.')).toBeInTheDocument());
  });

  it('closes dialog and clears state on cancel', async () => {
    renderSidebar();
    fireEvent.click(screen.getByRole('button', { name: /add a server/i }));
    await waitFor(() => screen.getByRole('dialog'));
    fireEvent.change(screen.getByLabelText(/server name/i), { target: { value: 'Draft' } });

    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('navigates to server on icon click', () => {
    renderSidebar();
    fireEvent.click(screen.getByText('TY'));
    expect(mockNavigate).toHaveBeenCalledWith('/app/srv-2');
  });

  it('navigates to /app on home button click', () => {
    renderSidebar();
    fireEvent.click(screen.getByText('D'));
    expect(mockNavigate).toHaveBeenCalledWith('/app');
  });
});
