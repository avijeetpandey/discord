import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import type { User } from '@/types';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
);

const mockUser: User = {
  id: 'abc-123',
  username: 'testuser',
  email: 'test@example.com',
  avatarUrl: null,
  createdAt: new Date().toISOString(),
};

describe('AuthContext', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it('initializes as unauthenticated when localStorage is empty', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
    expect(result.current.token).toBeNull();
  });

  it('login stores token and user in state and localStorage', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    act(() => result.current.login('jwt.token.here', mockUser));

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user).toEqual(mockUser);
    expect(result.current.token).toBe('jwt.token.here');
    expect(localStorage.getItem('discord_token')).toBe('jwt.token.here');
    expect(JSON.parse(localStorage.getItem('discord_user')!)).toEqual(mockUser);
  });

  it('logout clears state and localStorage', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    act(() => result.current.login('jwt.token.here', mockUser));
    act(() => result.current.logout());

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
    expect(result.current.token).toBeNull();
    expect(localStorage.getItem('discord_token')).toBeNull();
    expect(localStorage.getItem('discord_user')).toBeNull();
  });

  it('restores session from localStorage on mount', () => {
    localStorage.setItem('discord_token', 'persisted.jwt');
    localStorage.setItem('discord_user', JSON.stringify(mockUser));

    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.token).toBe('persisted.jwt');
    expect(result.current.user?.username).toBe('testuser');
  });

  it('throws when used outside AuthProvider', () => {
    expect(() => renderHook(() => useAuth())).toThrow('useAuth must be used within AuthProvider');
  });
});
