import React, { useState } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { useAuthStore } from '../shared/store/authStore.ts';
import { resetPasswordRoute } from '../router.tsx';

export function ResetPasswordScreen(): React.ReactElement {
  const navigate = useNavigate();
  const { token } = resetPasswordRoute.useSearch();
  const { resetPassword, isLoading } = useAuthStore();

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!token) {
    return (
      <div className="screen auth-screen">
        <div className="auth-content">
          <h1 className="auth-title">Invalid link</h1>
          <p style={{ color: 'var(--text-muted)', textAlign: 'center' }}>This reset link is missing or invalid.</p>
          <Link to="/forgot-password" className="primary-btn auth-submit-btn" style={{ textDecoration: 'none', textAlign: 'center', display: 'block' }}>
            Request a new one
          </Link>
        </div>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError("Passwords don't match");
      return;
    }
    try {
      await resetPassword(token, password);
      void navigate({ to: '/' });
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div className="screen auth-screen">
      <div className="auth-content">
        <h1 className="auth-title">New password</h1>
        <form className="auth-form" onSubmit={e => void handleSubmit(e)} noValidate>
          {error && (
            <div className="auth-error" role="alert">
              {error}
              <button type="button" className="auth-error-close" onClick={() => setError(null)} aria-label="Dismiss">×</button>
            </div>
          )}
          <div className="form-group">
            <label htmlFor="reset-password" className="form-label">New password</label>
            <input
              id="reset-password"
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
          <div className="form-group">
            <label htmlFor="reset-confirm" className="form-label">Confirm password</label>
            <input
              id="reset-confirm"
              type="password"
              className="form-input"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              autoComplete="new-password"
              required
              disabled={isLoading}
            />
          </div>
          <button
            type="submit"
            className="primary-btn auth-submit-btn"
            disabled={isLoading || !password || !confirm}
          >
            {isLoading ? 'Saving…' : 'Set new password'}
          </button>
        </form>
      </div>
    </div>
  );
}
