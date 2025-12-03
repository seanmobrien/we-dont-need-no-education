import type { ErrorContext } from "@/lib/error-monitoring/types";
import type { KnownSeverityLevel } from "@/lib/logger";

export type LoggedErrorOptions = ErrorOptions & {
  error: Error;
  critical?: boolean;
};

export type ErrorLogFactory = (options: {
  error: unknown;
  source: string;
  include?: object;
  severity?: string;
} & Record<string, unknown>) => Record<string, unknown>;

export type TurtleRecursionParams = Record<string, unknown> & {
  log: boolean;
  relog?: boolean;
  source?: string;
  message?: string;
  critical?: boolean;
  logCanceledOperation?: boolean;
  errorLogFactory?: ErrorLogFactory;
};

export type ErrorReportArgs = {
  error: Error | unknown;
  severity?: KnownSeverityLevel;
  context?: Partial<ErrorContext>;
}
