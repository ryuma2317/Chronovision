import { Component } from 'react';
import { AlertTriangle } from 'lucide-react';

// Without a boundary, ANY render/effect error unmounts the whole React tree and
// the user just sees a blank background with no clue what happened. This keeps
// the failure local and visible.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('Unhandled UI error:', error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
        <AlertTriangle size={40} className="text-danger mb-4" />
        <h2 className="text-xl font-bold text-heading mb-2">Something went wrong on this page</h2>
        <p className="text-sm text-muted mb-6 max-w-md">
          The rest of the app is still working. Try reloading — if it keeps happening, the
          details below will help track it down.
        </p>
        <pre className="text-xs text-danger bg-danger-bg rounded-lg px-4 py-3 mb-6 max-w-lg overflow-auto text-left">
          {this.state.error.message}
        </pre>
        <button
          onClick={() => window.location.reload()}
          className="inline-flex items-center justify-center rounded-lg bg-gold text-navy font-semibold px-4 py-2.5 text-sm"
        >
          Reload page
        </button>
      </div>
    );
  }
}