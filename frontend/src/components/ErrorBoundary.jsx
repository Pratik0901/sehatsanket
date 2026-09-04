import React from 'react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReset = () => {
    localStorage.clear();
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 text-center font-sans">
          <div className="w-16 h-16 rounded-3xl bg-red-500/20 text-red-400 border border-red-500/40 flex items-center justify-center mb-4 text-2xl font-bold">
            ⚠️
          </div>
          <h1 className="text-2xl font-black tracking-tight mb-2">Something went wrong</h1>
          <p className="text-sm text-slate-400 max-w-md mb-4 leading-relaxed">
            The application encountered a render issue. Clicking reset will clear any corrupted local storage state and reload the page.
          </p>
          <div className="p-4 rounded-2xl bg-slate-800 text-left font-mono text-xs text-red-300 max-w-lg overflow-x-auto mb-6">
            {this.state.error?.toString()}
          </div>
          <button
            onClick={this.handleReset}
            className="px-6 py-3 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-sm shadow-lg shadow-emerald-600/30 transition active:scale-95"
          >
            Reset State & Reload App
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
