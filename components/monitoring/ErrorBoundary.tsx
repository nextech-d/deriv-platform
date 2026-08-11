"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { reportClientError } from "@/lib/monitoring/report";

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  message: string | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    void reportClientError(error, { componentStack: info.componentStack });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-8 text-center">
          <p className="text-lg font-semibold text-negative">Something went wrong</p>
          <p className="max-w-md text-sm text-muted">
            {this.state.message ?? "An unexpected error occurred."}
          </p>
          <Button
            onClick={() => {
              this.setState({ hasError: false, message: null });
              window.location.reload();
            }}
          >
            Reload
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
