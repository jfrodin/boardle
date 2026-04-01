import React, { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { useAuthStore } from '../shared/store/authStore.ts';

export function ForgotPasswordScreen(): React.ReactElement {
  const { forgotPassword, isLoading } = useAuthStore();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setError(null);
    try {
      await forgotPassword(email);
      setSent(true);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div className="screen auth-screen">
      <div className="auth-content">
        <Link to="/login" className="back-to-portal-btn">← Back to login</Link>
        <h1 className="auth-title">Reset password</h1>

        {sent ? (
          <div className="auth-success">
            <p>Check your inbox — if that email is registered you'll get a reset link shortly.</p>
            <Link to="/login" className="primary-btn auth-submit-btn" style={{ marginTop: '1rem', textDecoration: 'none', textAlign: 'center', display: 'block' }}>
              Back to login
            </Link>
          </div>
        ) : (
          <form className="auth-form" onSubmit={e => void handleSubmit(e)} noValidate>
            {error && (
              <div className="auth-error" role="alert">
                {error}
                <button type="button" className="auth-error-close" onClick={() => setError(null)} aria-label="Dismiss">×</button>
              </div>
            )}
            <div className="form-group">
              <label htmlFor="forgot-email" className="form-label">Email</label>
              <input
                id="forgot-email"
                type="email"
                className="form-input"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="email"
                required
                disabled={isLoading}
              />
            </div>
            <button
              type="submit"
              className="primary-btn auth-submit-btn"
              disabled={isLoading || !email}
            >
              {isLoading ? 'Sending…' : 'Send reset link'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
