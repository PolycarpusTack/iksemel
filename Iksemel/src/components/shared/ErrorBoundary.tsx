import { Component } from "react";
import type { ReactNode, ErrorInfo } from "react";
import { createErrorTracker } from "@engine/error-tracking";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

/**
 * A shared error tracker instance used by all ErrorBoundary components.
 * Lives at module scope so captured errors are accessible from anywhere
 * that imports the error-tracking module.
 */
const tracker = createErrorTracker();

/**
 * React error boundary that catches render errors in its subtree.
 *
 * - Captures the error via the ErrorTracker (source: "runtime")
 * - Displays a friendly fallback UI instead of crashing the whole app
 * - Provides a "Reload" button to recover
 */
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, errorMessage: "" };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, errorMessage: error.message };
  }

  override componentDidCatch(error: Error, _info: ErrorInfo): void {
    tracker.captureException(error, "runtime");
  }

  private handleReload = (): void => {
    window.location.reload();
  };

  override render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback !== undefined) {
        return this.props.fallback;
      }

      return (
        <div
          role="alert"
          style={{
            padding: "2rem",
            textAlign: "center",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          <h2 style={{ marginBottom: "0.5rem" }}>Something went wrong</h2>
          <p style={{ color: "#666", marginBottom: "1rem" }}>
            {this.state.errorMessage || "An unexpected error occurred."}
          </p>
          <button
            type="button"
            onClick={this.handleReload}
            style={{
              padding: "0.5rem 1.25rem",
              borderRadius: "4px",
              border: "1px solid #ccc",
              background: "#f5f5f5",
              cursor: "pointer",
              fontSize: "0.875rem",
            }}
          >
            Reload
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export { ErrorBoundary };
