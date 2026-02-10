/**
 * Context enricher interface for errors that can provide additional context
 */
export interface IContextEnricher {
  enrichContext(context: ErrorContext): Promise<ErrorContext>;
}

/**
 * Error context for logging and reporting
 */
export type ErrorContext = {
  userId?: string;
  sessionId?: string;
  source?: string;
  userAgent?: string;
  url?: string;
  timestamp?: Date;
  componentStack?: string;
  errorBoundary?: string;
  breadcrumbs?: string[];
  additionalData?: Record<string, unknown>;
  error?: Error;
} & Record<string, unknown>;
