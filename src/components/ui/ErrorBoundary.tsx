import { Component, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { t } from '@/i18n/translations';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error.message, errorInfo.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="h-full flex items-center justify-center bg-background p-8">
          <div className="panel p-8 max-w-md w-full text-center space-y-4">
            <AlertTriangle size={40} className="mx-auto text-yellow-500" />
            <h2 className="text-lg font-semibold">{t['zh-CN']['error.title']}</h2>
            <p className="text-sm text-muted-foreground">{t['zh-CN']['error.title']}</p>
            {this.state.error && (
              <pre className="text-xs bg-muted/30 rounded-md p-3 text-left overflow-auto max-h-32">
                {this.state.error.message}
              </pre>
            )}
            <button className="btn-primary mx-auto" onClick={this.handleReset}>
              <RefreshCw size={14} />
              Try Again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
