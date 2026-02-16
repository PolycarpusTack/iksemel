export interface ErrorReport {
  readonly message: string;
  readonly stack?: string;
  readonly source: "runtime" | "promise" | "parser" | "generation" | "bridge";
  readonly timestamp: number;
  readonly context?: Record<string, string>;
}

export interface ErrorTracker {
  capture(error: ErrorReport): void;
  captureException(err: unknown, source: ErrorReport["source"]): void;
  setContext(key: string, value: string): void;
  getReports(): readonly ErrorReport[];
  clear(): void;
  readonly enabled: boolean;
}

export interface ErrorTrackerConfig {
  readonly enabled: boolean;
  readonly maxReports: number;
  readonly onReport?: (report: ErrorReport) => void;
}
