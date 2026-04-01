import React from 'react';

interface Props {
  children: React.ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  render(): React.ReactNode {
    if (this.state.error) {
      return (
        <div className="screen error-boundary-screen">
          <div className="error-boundary-content">
            <h1 className="error-boundary-title">Something went wrong</h1>
            <p className="error-boundary-message">
              The game crashed unexpectedly. Sorry about that!
            </p>
            <p className="error-boundary-detail">{this.state.error.message}</p>
            <div className="error-boundary-actions">
              <a href="/" className="primary-btn">Go to Home</a>
              <a
                href={`mailto:bugs.boardle@gmail.com?subject=Crash%20report%20%E2%80%94%20Boardle&body=Error%3A%20${encodeURIComponent(this.state.error.message)}%0A%0AWhat%20I%20was%20doing%3A%0A`}
                className="secondary-btn"
              >
                Report this bug
              </a>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
