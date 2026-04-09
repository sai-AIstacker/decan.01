"use client";

import React from "react";
import { AlertCircle, RefreshCw, Wifi, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isNetworkError, isAuthError, formatErrorMessage } from "@/lib/error-handling";

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorCount: number;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  /** Optional label shown in the error card heading */
  context?: string;
  /** Called when error boundary catches an error */
  onError?: (error: Error) => void;
}

/**
 * ComponentErrorBoundary
 * A client-side React Error Boundary for wrapping individual UI sections.
 * Shows a styled error card with retry, error categorization, and helpful suggestions.
 */
export class ComponentErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  private resetTimeoutId: NodeJS.Timeout | null = null;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, errorCount: 0 };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);

    // Call callback if provided
    this.props.onError?.(error);

    // Track error count for debugging
    this.setState((prev) => ({
      errorCount: prev.errorCount + 1,
    }));
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  renderErrorContent() {
    const { context } = this.props;
    const { error } = this.state;
    const message = error?.message || "An unexpected error occurred";

    // Check error type
    const isNetErr = isNetworkError(error);
    const isAuthErr = isAuthError(error);

    const icon = isAuthErr ? (
      <Lock className="w-7 h-7 text-amber-500" />
    ) : isNetErr ? (
      <Wifi className="w-7 h-7 text-orange-500" />
    ) : (
      <AlertCircle className="w-7 h-7 text-rose-500" />
    );

    const iconBg = isAuthErr
      ? "bg-amber-100 dark:bg-amber-500/10"
      : isNetErr
        ? "bg-orange-100 dark:bg-orange-500/10"
        : "bg-rose-100 dark:bg-rose-500/10";

    const borderColor = isAuthErr
      ? "border-amber-200/50 dark:border-amber-500/20"
      : isNetErr
        ? "border-orange-200/50 dark:border-orange-500/20"
        : "border-rose-200/50 dark:border-rose-500/20";

    const bgColor = isAuthErr
      ? "bg-amber-50/30 dark:bg-amber-500/5"
      : isNetErr
        ? "bg-orange-50/30 dark:bg-orange-500/5"
        : "bg-rose-50/30 dark:bg-rose-500/5";

    const title = context
      ? `${context} — ${isAuthErr ? "Access Denied" : isNetErr ? "Connection Error" : "Something went wrong"}`
      : isAuthErr
        ? "Access Denied"
        : isNetErr
          ? "Connection Error"
          : "Something went wrong";

    const suggestion = isAuthErr
      ? "Your session may have expired. Please log in again."
      : isNetErr
        ? "Please check your internet connection and try again."
        : "Try refreshing the page or contact support if the problem persists.";

    return (
      <div className={`flex flex-col items-center justify-center min-h-[300px] w-full p-8 border ${borderColor} rounded-2xl ${bgColor}`}>
        <div className={`w-14 h-14 rounded-full ${iconBg} flex items-center justify-center mb-4`}>
          {icon}
        </div>

        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 text-center">
          {title}
        </h3>

        <p className="mt-2 text-sm text-center text-zinc-600 dark:text-zinc-400 max-w-sm leading-relaxed">
          {formatErrorMessage(error)}
        </p>

        <p className="mt-3 text-sm text-center text-zinc-500 dark:text-zinc-500 max-w-sm italic">
          {suggestion}
        </p>

        <div className="mt-6 flex gap-3">
          <Button
            onClick={this.handleRetry}
            variant={isAuthErr ? "default" : "outline"}
            className={`rounded-xl ${
              isAuthErr
                ? ""
                : isNetErr
                  ? "border-orange-200 dark:border-orange-500/30 text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-500/10"
                  : "border-rose-200 dark:border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10"
            }`}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            {isAuthErr ? "Sign In" : "Try Again"}
          </Button>

          {isAuthErr && (
            <Button
              onClick={() => (window.location.href = "/login")}
              variant="outline"
              className="rounded-xl border-amber-200 dark:border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-500/10"
            >
              Go to Login
            </Button>
          )}
        </div>

        {/* Debug info in development */}
        {process.env.NODE_ENV === "development" && (
          <div className="mt-6 w-full p-3 rounded bg-zinc-900/50 text-xs text-zinc-300 font-mono overflow-auto max-h-24">
            <div>Error Count: {this.state.errorCount}</div>
            <div className="mt-1 text-zinc-400">{message}</div>
          </div>
        )}
      </div>
    );
  }

  render() {
    if (this.state.hasError) {
      return this.renderErrorContent();
    }

    return this.props.children;
  }
}
