/**
 * Error recovery strategies and helpers
 */
export declare enum ErrorType {
  NETWORK = 'network',
  AUTHENTICATION = 'authentication',
  VALIDATION = 'validation',
  PERMISSION = 'permission',
  RATE_LIMIT = 'rate_limit',
  SERVER = 'server',
  CLIENT = 'client',
  UNKNOWN = 'unknown',
}

/**
 * Action that can recover from an error.
 */
export interface RecoveryAction {
  id: string;
  label: string;
  description: string;
  action: () => Promise<void> | void;
  automatic?: boolean;
  delay?: number;
  maxRetries?: number;
}

/**
 * Strategy describing how to detect and respond to an error type.
 */
export interface RecoveryStrategy {
  errorType: ErrorType;
  detect: (error: Error) => boolean;
  actions: RecoveryAction[];
  defaultAction?: string;
}

/**
 * All built-in recovery strategies provided by the application.
 */
export declare const recoveryStrategies: RecoveryStrategy[];

/** Analyze an error and return a normalized ErrorType */
export declare function classifyError(error: Error): ErrorType;

/** Get the available recovery actions for an error */
export declare function getRecoveryActions(error: Error): RecoveryAction[];

/** Get the default recovery action (if any) for an error */
export declare function getDefaultRecoveryAction(
  error: Error,
): RecoveryAction | null;

/** Attempt to automatically perform the default recovery action */
export declare function attemptAutoRecovery(error: Error): Promise<boolean>;
