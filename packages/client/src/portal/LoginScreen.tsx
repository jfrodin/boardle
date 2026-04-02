import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from '@tanstack/react-router';
import { useAuthStore } from '../shared/store/authStore.ts';

export function LoginScreen(): React.ReactElement {
  const navigate = useNavigate();
  const { login, isLoading, error, clearError, user } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // If already logged in, redirect to portal
  useEffect(() => {
    if (user) void navigate({ to: '/' });
  }, [user, navigate]);

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    try {
      await login(email, password);
      void navigate({ to: '/' });
    } catch {
      // error is set in the store
    }
  }

  return (
    <div className="screen auth-screen">
      <div className="auth-content">
        <Link to="/" className="back-to-portal-btn">← All Games</Link>
        <h1 className="auth-title">Welcome back</h1>

        <form className="auth-form" onSubmit={e => void handleSubmit(e)} noValidate>
          {error && (
            <div className="auth-error" role="alert">
              {error}
              <button type="button" className="auth-error-close" onClick={clearError} aria-label="Dismiss">×</button>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="login-email" className="form-label">Email</label>
            <input
              id="login-email"
              type="email"
              className="form-input"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoComplete="email"
              required
              disabled={isLoading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="login-password" className="form-label">Password</label>
            <input
              id="login-password"
              type="password"
              className="form-input"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              disabled={isLoading}
            />
          </div>

          <button
            type="submit"
            className="primary-btn auth-submit-btn"
            disabled={isLoading || !email || !password}
          >
            {isLoading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="auth-switch">
          No account?{' '}
          <Link to="/register" className="auth-link">Create one</Link>
        </p>
        <p className="auth-switch">
          <Link to="/forgot-password" className="auth-link">Forgot password?</Link>
        </p>
      </div>
    </div>
  );
}
