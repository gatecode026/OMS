import React, { Component } from 'react';
import { AlertTriangle, RefreshCw, Home, Terminal } from 'lucide-react';

/**
 * Global ErrorBoundary Component
 * Catches JavaScript render errors and dynamic chunk import failures anywhere in child component tree.
 * Prevents full blank white screen by displaying an interactive, clean fallback interface.
 */
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error('[ErrorBoundary] Uncaught application error:', error, errorInfo);

    // If chunk loading error, attempt auto-reload if not already reloaded recently
    const isChunkError =
      error?.name === 'ChunkLoadError' ||
      error?.message?.includes('Failed to fetch dynamically imported module') ||
      error?.message?.includes('Importing a module script failed');

    if (isChunkError) {
      const reloaded = sessionStorage.getItem('eb_chunk_auto_reloaded');
      if (!reloaded) {
        sessionStorage.setItem('eb_chunk_auto_reloaded', 'true');
        window.location.reload();
      }
    }
  }

  handleReload = () => {
    sessionStorage.removeItem('eb_chunk_auto_reloaded');
    sessionStorage.removeItem('chunk_reload_triggered');
    window.location.reload();
  };

  handleGoHome = () => {
    sessionStorage.removeItem('eb_chunk_auto_reloaded');
    sessionStorage.removeItem('chunk_reload_triggered');
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const isChunkError =
        this.state.error?.name === 'ChunkLoadError' ||
        this.state.error?.message?.includes('Failed to fetch dynamically imported module');

      return (
        <div style={styles.overlay}>
          <div style={styles.card}>
            <div style={styles.iconRing}>
              <AlertTriangle size={32} color="#ef4444" />
            </div>

            <h2 style={styles.title}>
              {isChunkError ? 'Session Updated' : 'Something Went Wrong'}
            </h2>

            <p style={styles.description}>
              {isChunkError
                ? 'The application was updated or was idle for a while. Refreshing will load the latest version.'
                : 'An unexpected issue occurred while displaying this page. Reloading usually fixes it.'}
            </p>

            <div style={styles.buttonGroup}>
              <button onClick={this.handleReload} style={{ ...styles.button, ...styles.primaryBtn }}>
                <RefreshCw size={16} style={{ marginRight: '8px' }} />
                Reload Page
              </button>
              <button onClick={this.handleGoHome} style={{ ...styles.button, ...styles.secondaryBtn }}>
                <Home size={16} style={{ marginRight: '8px' }} />
                Go to Dashboard
              </button>
            </div>

            <div style={styles.detailsToggle}>
              <button
                onClick={() => this.setState(prev => ({ showDetails: !prev.showDetails }))}
                style={styles.toggleBtn}
              >
                <Terminal size={14} style={{ marginRight: '6px' }} />
                {this.state.showDetails ? 'Hide Error Details' : 'Show Error Details'}
              </button>
            </div>

            {this.state.showDetails && (
              <div style={styles.errorBox}>
                <code>{this.state.error?.toString()}</code>
                {this.state.errorInfo?.componentStack && (
                  <pre style={styles.stackTrace}>{this.state.errorInfo.componentStack}</pre>
                )}
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const styles = {
  overlay: {
    minHeight: '80vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
    backgroundColor: 'var(--bg-main, #f8fafc)'
  },
  card: {
    maxWidth: '520px',
    width: '100%',
    backgroundColor: 'var(--bg-card, #ffffff)',
    borderRadius: '16px',
    padding: '36px 32px',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04)',
    border: '1px solid var(--border-color, #e2e8f0)',
    textAlign: 'center'
  },
  iconRing: {
    width: '64px',
    height: '64px',
    borderRadius: '50%',
    backgroundColor: '#fee2e2',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '20px'
  },
  title: {
    fontSize: '1.4rem',
    fontWeight: '700',
    color: 'var(--text-main, #0f172a)',
    margin: '0 0 10px 0'
  },
  description: {
    fontSize: '0.92rem',
    color: 'var(--text-muted, #64748b)',
    lineHeight: '1.5',
    margin: '0 0 24px 0'
  },
  buttonGroup: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'center',
    flexWrap: 'wrap'
  },
  button: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '10px 20px',
    borderRadius: '10px',
    fontWeight: '600',
    fontSize: '0.88rem',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    border: 'none'
  },
  primaryBtn: {
    backgroundColor: '#2563eb',
    color: '#ffffff'
  },
  secondaryBtn: {
    backgroundColor: 'var(--bg-hover, #f1f5f9)',
    color: 'var(--text-main, #334155)',
    border: '1px solid var(--border-color, #cbd5e1)'
  },
  detailsToggle: {
    marginTop: '24px'
  },
  toggleBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--text-muted, #64748b)',
    fontSize: '0.8rem',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center'
  },
  errorBox: {
    marginTop: '16px',
    padding: '12px 16px',
    backgroundColor: '#1e293b',
    color: '#f8fafc',
    borderRadius: '8px',
    textAlign: 'left',
    fontSize: '0.78rem',
    overflowX: 'auto',
    maxHeight: '200px'
  },
  stackTrace: {
    fontSize: '0.72rem',
    opacity: 0.8,
    marginTop: '8px',
    whiteSpace: 'pre-wrap'
  }
};

export default ErrorBoundary;
