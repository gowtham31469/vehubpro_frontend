import { Component } from 'react'

// Without this, any uncaught render-time error blanks the entire app silently
// (no error boundary anywhere in the tree) — this at least surfaces something
// recoverable instead of a blank white page.
export default class ErrorBoundary extends Component {
  state = { hasError: false, error: null, componentStack: '' }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('Unhandled render error:', error, info)
    this.setState({ componentStack: info?.componentStack || '' })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-white px-4 text-center">
          <div className="max-w-2xl">
            <h1 className="text-xl font-bold text-slate-900">Something went wrong</h1>
            <p className="mt-2 text-sm text-slate-500">Please reload the page.</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
            >
              Reload
            </button>
            {/* Shown so the error can be reported without opening DevTools. */}
            <pre className="mt-6 overflow-auto rounded-lg bg-slate-100 p-4 text-left text-xs text-rose-700">
              {String(this.state.error?.stack || this.state.error?.message || this.state.error || 'Unknown error')}
              {this.state.componentStack}
            </pre>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
