import React from 'react';

import { ErrorState } from '@/components/ErrorState';

type ErrorBoundaryProps = {
  children: React.ReactNode;
  onReset?: () => void;
};

type ErrorBoundaryState = {
  hasError: boolean;
};

/** Best-effort reload via expo-updates; falls back to clearing the error. */
async function reload() {
  try {
    const Updates = await import('expo-updates');
    await Updates.reloadAsync();
  } catch (err) {
    console.warn('ErrorBoundary: reload failed', err);
  }
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false });
    if (this.props.onReset) {
      this.props.onReset();
    } else {
      reload();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <ErrorState
          title="Something broke"
          message="The app hit an unexpected error."
          retryLabel="Start over"
          onRetry={this.handleReset}
        />
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
