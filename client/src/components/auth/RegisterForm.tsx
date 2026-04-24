import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/context/AuthContext';
import { isAxiosError } from 'axios';
import api from '@/lib/api';
import type { AuthResponse } from '@/types';

export default function RegisterForm() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setFieldErrors({});
    setLoading(true);
    try {
      const { data } = await api.post<AuthResponse>('/auth/register', {
        username,
        email,
        password,
      });
      login(data.token, data.user);
      navigate('/app');
    } catch (err: unknown) {
      if (isAxiosError(err)) {
        const data = err.response?.data as { error?: string; fields?: Record<string, string> };
        if (data?.fields) {
          setFieldErrors(data.fields);
        } else {
          setError(data?.error ?? 'Registration failed. Please try again.');
        }
      } else {
        setError('Registration failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive text-center">
          {error}
        </p>
      )}

      <div className="space-y-2">
        <Label htmlFor="username">Username</Label>
        <Input
          id="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="cooluser"
          required
          minLength={3}
          maxLength={32}
          autoComplete="username"
        />
        {fieldErrors.username && <p className="text-xs text-destructive">{fieldErrors.username}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          required
          autoComplete="email"
        />
        {fieldErrors.email && <p className="text-xs text-destructive">{fieldErrors.email}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          required
          minLength={8}
          autoComplete="new-password"
        />
        {fieldErrors.password && <p className="text-xs text-destructive">{fieldErrors.password}</p>}
      </div>

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? 'Creating account…' : 'Create Account'}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link to="/login" className="text-primary hover:underline font-medium">
          Log in
        </Link>
      </p>
    </form>
  );
}
