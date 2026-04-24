import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import AppPage from '@/pages/AppPage';
import api from '@/lib/api';
import type { Server, ServerDetail } from '@/types';

vi.mock('@/lib/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
  },
}));

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-1', username: 'alice', email: 'alice@test.com', avatarUrl: null, createdAt: '' },
    isAuthenticated: true,
    token: 'jwt.token',
    login: vi.fn(),
    logout: vi.fn(),
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/context/SocketContext', () => ({
  useSocket: () => ({ client: null, connected: false, subscribe: vi.fn(), publish: vi.fn() }),
  SocketProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/hooks/useMessages', () => ({
  useMessages: () => ({
    messages: [],
    loading: false,
    hasMore: false,
    loadMore: vi.fn(),
    sendMessage: vi.fn(),
    editMessage: vi.fn(),
    deleteMessage: vi.fn(),
  }),
}));

vi.mock('@/hooks/usePresence', () => ({
  usePresence: () => ({ onlineUsers: new Set<string>() }),
}));

const mockServers: Server[] = [
  {
    id: 'srv-1',
    name: 'Rust Devs',
    iconUrl: null,
    inviteCode: 'CODE1',
    ownerId: 'user-1',
    createdAt: '',
  },
];

const mockDetail: ServerDetail = {
  id: 'srv-1',
  name: 'Rust Devs',
  iconUrl: null,
  inviteCode: 'CODE1',
  owner: { id: 'user-1', username: 'alice', email: 'alice@test.com', avatarUrl: null, createdAt: '' },
  channels: [
    { id: 'ch-1', serverId: 'srv-1', name: 'general', type: 'TEXT', position: 0, createdAt: '' },
    { id: 'ch-2', serverId: 'srv-1', name: 'random', type: 'TEXT', position: 1, createdAt: '' },
  ],
  members: [
    { id: 'm-1', userId: 'user-1', username: 'alice', avatarUrl: null, role: 'OWNER', joinedAt: '' },
  ],
  createdAt: '',
};

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

function renderApp(path = '/app') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/app" element={<AppPage />} />
        <Route path="/app/:serverId" element={<AppPage />} />
        <Route path="/app/:serverId/:channelId" element={<AppPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('AppPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url === '/servers') return Promise.resolve({ data: mockServers });
      if (url.startsWith('/servers/srv-1')) return Promise.resolve({ data: mockDetail });
      return Promise.reject(new Error('Not found'));
    });
  });

  it('renders server sidebar, channel sidebar, and chat area', async () => {
    renderApp('/app/srv-1/ch-1');

    await waitFor(() => {
      expect(screen.getByText('Rust Devs')).toBeInTheDocument();
    });
    // 'general' appears in channel list AND chat header — just confirm at least one exists
    expect(screen.getAllByText('general').length).toBeGreaterThanOrEqual(1);
  });

  it('shows welcome screen when no channel selected in root /app', async () => {
    renderApp('/app');
    await waitFor(() => expect(screen.getByText(/welcome to discord clone/i)).toBeInTheDocument());
  });

  it('loads server detail when serverId param is present', async () => {
    renderApp('/app/srv-1/ch-1');
    await waitFor(() => {
      expect(vi.mocked(api.get)).toHaveBeenCalledWith('/servers/srv-1');
    });
  });

  it('auto-navigates to first channel when only serverId is in URL', async () => {
    renderApp('/app/srv-1');
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/app/srv-1/ch-1', { replace: true });
    });
  });

  it('renders all servers in the server sidebar', async () => {
    renderApp('/app/srv-1/ch-1');
    await waitFor(() => {
      expect(screen.getByText('RU')).toBeInTheDocument();
    });
  });

  it('renders channel list for the active server', async () => {
    renderApp('/app/srv-1/ch-1');
    await waitFor(() => {
      // 'general' appears in both sidebar and chat header; use getAllByText
      expect(screen.getAllByText('general').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('random')).toBeInTheDocument();
    });
  });

  it('renders members list for the active server', async () => {
    renderApp('/app/srv-1/ch-1');
    await waitFor(() => {
      expect(screen.getByText('alice')).toBeInTheDocument();
    });
  });

  it('renders current user name in user panel', async () => {
    renderApp('/app/srv-1/ch-1');
    await waitFor(() => {
      const aliceElements = screen.getAllByText('alice');
      expect(aliceElements.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('shows channel message input when channel is active', async () => {
    renderApp('/app/srv-1/ch-1');
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/connecting|message #general/i)).toBeInTheDocument();
    });
  });
});
