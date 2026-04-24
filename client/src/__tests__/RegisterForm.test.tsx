import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import RegisterForm from '@/components/auth/RegisterForm';
import api from '@/lib/api';

vi.mock('@/lib/api', () => ({
  default: {
    post: vi.fn(),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
  },
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

const Wrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>
    <AuthProvider>{children}</AuthProvider>
  </BrowserRouter>
);

function fillForm(username = 'alice', email = 'alice@test.com', password = 'Password123!') {
  fireEvent.change(screen.getByLabelText(/username/i), { target: { value: username } });
  fireEvent.change(screen.getByLabelText(/email/i), { target: { value: email } });
  fireEvent.change(screen.getByLabelText(/password/i), { target: { value: password } });
}

describe('RegisterForm', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    localStorage.clear();
  });

  it('renders all form fields and submit button', () => {
    render(<RegisterForm />, { wrapper: Wrapper });
    expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
  });

  it('renders link to login page', () => {
    render(<RegisterForm />, { wrapper: Wrapper });
    expect(screen.getByRole('link', { name: /log in/i })).toHaveAttribute('href', '/login');
  });

  it('disables button and shows loading text while submitting', async () => {
    vi.mocked(api.post).mockImplementation(() => new Promise(() => {}));
    render(<RegisterForm />, { wrapper: Wrapper });

    fillForm();
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /creating account/i })).toBeDisabled();
    });
  });

  it('navigates to /app on successful registration', async () => {
    vi.mocked(api.post).mockResolvedValueOnce({
      data: {
        token: 'jwt.token',
        user: {
          id: '1',
          username: 'alice',
          email: 'alice@test.com',
          avatarUrl: null,
          createdAt: new Date().toISOString(),
        },
      },
    });

    render(<RegisterForm />, { wrapper: Wrapper });
    fillForm();
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/app'));
  });

  it('shows field errors on 400 validation response', async () => {
    vi.mocked(api.post).mockRejectedValueOnce(
      Object.assign(new Error('Validation error'), {
        isAxiosError: true,
        response: {
          status: 400,
          data: { fields: { email: 'Invalid email format', password: 'Too short' } },
        },
      }),
    );

    render(<RegisterForm />, { wrapper: Wrapper });
    // Use valid email format since we're testing server-returned field errors
    fillForm('alice', 'alice@test.com', 'short');
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getByText('Invalid email format')).toBeInTheDocument();
      expect(screen.getByText('Too short')).toBeInTheDocument();
    });
  });

  it('shows error message on server error', async () => {
    vi.mocked(api.post).mockRejectedValueOnce(
      Object.assign(new Error('Conflict'), {
        isAxiosError: true,
        response: { status: 409, data: { error: 'Email already taken' } },
      }),
    );

    render(<RegisterForm />, { wrapper: Wrapper });
    fillForm();
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => expect(screen.getByText('Email already taken')).toBeInTheDocument());
  });

  it('falls back to generic error when no response body', async () => {
    vi.mocked(api.post).mockRejectedValueOnce({});

    render(<RegisterForm />, { wrapper: Wrapper });
    fillForm();
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() =>
      expect(screen.getByText(/registration failed/i)).toBeInTheDocument(),
    );
  });
});
