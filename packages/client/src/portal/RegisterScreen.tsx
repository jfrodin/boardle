import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from '@tanstack/react-router';
import { useAuthStore } from '../shared/store/authStore.ts';

export function RegisterScreen(): React.ReactElement {
  const navigate = useNavigate();
  const { register, isLoading, error, clearError, user } = useAuthStore();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // If already logged in, redirect to portal
  useEffect(() => {
    if (user) void navigate({ to: '/' });
  }, [user, navigate]);

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    try {
      await register(username, email, password);
      void navigate({ to: '/' });
    } catch {
      // error is set in the store
    }
  }

  return (
    <div className="screen auth-screen">
      <div className="auth-content">
        <Link to="/" className="back-to-portal-btn">← All Games</Link>
        <h1 className="auth-title">Create account</h1>

        <form className="auth-form" onSubmit={e => void handleSubmit(e)} noValidate>
          {error && (
            <div className="auth-error" role="alert">
              {error}
              <button type="button" className="auth-error-close" onClick={clearError} aria-label="Dismiss">×</button>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="reg-username" className="form-label">
              Username <span className="form-hint">3–20 chars, letters/numbers/_ or -</span>
            </label>
            <input
              id="reg-username"
              type="text"
              className="form-input"
              value={username}
              onChange={e => setUsername(e.target.value)}
              autoComplete="username"
              minLength={3}
              maxLength={20}
              required
              disabled={isLoading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="reg-email" className="form-label">Email</label>
            <input
              id="reg-email"
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
            <label htmlFor="reg-password" className="form-label">
              Password <span className="form-hint">min 8 characters</span>
            </label>
            <input
              id="reg-password"
              type="password"
              className="form-input"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="new-password"
              minLength={8}
              required
              disabled={isLoading}
            />
          </div>

          <button
            type="submit"
            className="primary-btn auth-submit-btn"
            disabled={isLoading || !username || !email || !password}
          >
            {isLoading ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="auth-switch">
          Already have an account?{' '}
          <Link to="/login" className="auth-link">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
