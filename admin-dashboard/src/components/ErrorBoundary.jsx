import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '40px', textAlign: 'center', background: 'white', borderRadius: '12px', margin: '20px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
          <AlertTriangle size={48} color="#CC0000" style={{ margin: '0 auto 16px' }} />
          <h2 style={{ color: '#1a1a2e', marginBottom: '8px' }}>Something went wrong.</h2>
          <p style={{ color: '#666', marginBottom: '20px', maxWidth: '400px', margin: '0 auto 20px' }}>
            A rendering error occurred in this module. Please try reloading the page.
          </p>
          <button 
            className="btn btn-primary" 
            onClick={() => window.location.reload()}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
          >
            <RefreshCw size={16} /> Reload Page
          </button>
          
          {process.env.NODE_ENV === 'development' && (
            <pre style={{ marginTop: '30px', textAlign: 'left', background: '#f5f5f5', padding: '16px', borderRadius: '8px', overflowX: 'auto', fontSize: '0.85rem', color: '#CC0000' }}>
              {this.state.error?.toString()}
            </pre>
          )}
        </div>
      );
    }

    return this.props.children; 
  }
}
