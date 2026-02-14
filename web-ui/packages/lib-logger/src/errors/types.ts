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

export type IPostgresError = Error & {  
  name: 'DrizzleError';
  code?: string;
  severity?: string;
  detail?: string;
  hint?: string;
  position?: string;
  internalPosition?: string;
  internalQuery?: string;
  where?: string;
  schema?: string;
  table?: string;
  column?: string;
  dataType?: string;
  constraint?: string; 
  file?: string;
  line?: string;
  routine?: string;
  query?: string;
  parameters?: unknown[];
  cause?: unknown; 
  originalError?: unknown;
}
