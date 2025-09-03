/**
 * Error recovery strategies for different types of errors
 * Provides automatic and manual recovery mechanisms
 */

import { log } from '../logger';
import { clientNavigateSignIn, clientReload } from '../nextjs-util';
import { isRunningOnEdge } from '../site-util/env';

/**
 * Determines the type of error for appropriate recovery strategy
 */
export enum ErrorType {
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
 * Recovery action that can be taken for an error
 */
export interface RecoveryAction {
  id: string;
  label: string;
  description: string;
  action: () => Promise<void> | void;
  automatic?: boolean; // Whether this action can be taken automatically
  delay?: number; // Delay before automatic action (ms)
  maxRetries?: number; // Maximum number of automatic retries
}

/**
 * Recovery strategy for a specific error type
 */
export interface RecoveryStrategy {
  errorType: ErrorType;
  detect: (error: Error) => boolean;
  actions: RecoveryAction[];
  defaultAction?: string; // ID of the default action
}

const uiOnly = (
  action: RecoveryAction | string,
  doIt: () => void,
): (() => void | Promise<void>) => {
  const recoveryAction =
    typeof action === 'string'
      ? (recoveryStrategies && Array.isArray(recoveryStrategies)
          ? recoveryStrategies
              .flatMap((s) => s.actions)
              .find((a) => a.id === action)
          : undefined) ?? {
          id: action,
          label: `Action ${action} not found.`,
        }
      : action;
  if (typeof window !== 'undefined' && !isRunningOnEdge()) {
    return doIt;
  } else {
    return () =>
      log((l) =>
        l.info(
          `UI-only action ${recoveryAction.label} skipped in ${typeof window === 'undefined' ? 'server' : 'edge'} environment.`,
        ),
      );
  }
};

/**
 * Analyzes an error and determines its type
 */
export function classifyError(error: Error): ErrorType {
  const message = error.message.toLowerCase();
  const stack = error.stack?.toLowerCase() || '';

  // Server errors (check first to avoid false positives)
  if (
    message.includes('internal server error') ||
    message.includes('server error') ||
    message.includes('500') ||
    message.includes('502') ||
    message.includes('503') ||
    message.includes('504') ||
    message.includes('bad gateway') ||
    message.includes('service unavailable') ||
    message.includes('gateway timeout')
  ) {
    return ErrorType.SERVER;
  }

  // Rate limiting
  if (
    message.includes('rate limit') ||
    message.includes('too many requests') ||
    message.includes('429')
  ) {
    return ErrorType.RATE_LIMIT;
  }

  // Authentication errors (check stack trace first for specificity)
  if (
    stack.includes('auth') ||
    message.includes('unauthorized') ||
    message.includes('authentication') ||
    message.includes('login') ||
    message.includes('token')
  ) {
    return ErrorType.AUTHENTICATION;
  }

  // Permission errors
  if (
    message.includes('forbidden') ||
    message.includes('permission') ||
    message.includes('access denied') ||
    message.includes('not allowed')
  ) {
    return ErrorType.PERMISSION;
  }

  // Network errors (after server errors to avoid false positives)
  if (
    message.includes('fetch') ||
    message.includes('network') ||
    message.includes('connection') ||
    message.includes('timeout') ||
    (error.name === 'TypeError' && message.includes('failed to fetch'))
  ) {
    return ErrorType.NETWORK;
  }

  // Validation errors
  if (
    message.includes('validation') ||
    message.includes('invalid') ||
    message.includes('required') ||
    error.name === 'ValidationError'
  ) {
    return ErrorType.VALIDATION;
  }

  // Client-side errors
  if (
    error.name === 'ReferenceError' ||
    error.name === 'TypeError' ||
    error.name === 'RangeError'
  ) {
    return ErrorType.CLIENT;
  }

  return ErrorType.UNKNOWN;
}

/**
 * Recovery strategies for different error types
 */
export const recoveryStrategies: RecoveryStrategy[] = [
  {
    errorType: ErrorType.NETWORK,
    detect: (error) => classifyError(error) === ErrorType.NETWORK,
    actions: [
      {
        id: 'retry-request',
        label: 'Retry Request',
        description: 'Attempt the request again',
        action: clientReload,
        automatic: true,
        delay: 1000,
        maxRetries: 3,
      },
      {
        id: 'check-connection',
        label: 'Check Connection',
        description: 'Verify your internet connection',
        action: uiOnly('check-connection', () => {
          if (navigator.onLine) {
            alert('Connection appears to be working. Please try again.');
          } else {
            alert(
              'No internet connection detected. Please check your connection.',
            );
          }
        }),
      },
      {
        id: 'refresh-page',
        label: 'Refresh Page',
        description: 'Reload the page to start fresh',
        action: clientReload,
      },
    ],
    defaultAction: 'retry-request',
  },
  {
    errorType: ErrorType.AUTHENTICATION,
    detect: (error) => classifyError(error) === ErrorType.AUTHENTICATION,
    actions: [
      {
        id: 'login-redirect',
        label: 'Sign In Again',
        description: 'Redirect to login page',
        action: clientNavigateSignIn,
        automatic: true,
        delay: 2000,
      },
      {
        id: 'refresh-token',
        label: 'Refresh Session',
        description: 'Attempt to refresh authentication token',
        action: clientNavigateSignIn,
      },
    ],
    defaultAction: 'login-redirect',
  },
  {
    errorType: ErrorType.PERMISSION,
    detect: (error) => classifyError(error) === ErrorType.PERMISSION,
    actions: [
      {
        id: 'contact-admin',
        label: 'Contact Administrator',
        description: 'Request access from system administrator',
        action: uiOnly('contact-admin', () => {
          alert(
            'You do not have permission to perform this action. Please contact your administrator.',
          );
        }),
      },
      {
        id: 'go-back',
        label: 'Go Back',
        description: 'Return to the previous page',
        action: uiOnly('go-back', () => window.history.back()),
      },
    ],
    defaultAction: 'contact-admin',
  },
  {
    errorType: ErrorType.RATE_LIMIT,
    detect: (error) => classifyError(error) === ErrorType.RATE_LIMIT,
    actions: [
      {
        id: 'wait-retry',
        label: 'Wait and Retry',
        description: 'Wait for rate limit to reset and try again',
        action: uiOnly('wait-retry', () => {
          setTimeout(clientReload, 60000); // Wait 1 minute
        }),
        automatic: true,
        delay: 60000,
      },
      {
        id: 'reduce-requests',
        label: 'Reduce Activity',
        description: 'Slow down your requests and try again later',
        action: uiOnly('reduce-requests', () =>
          alert(
            'Rate limit exceeded. Please slow down your requests and try again in a minute.',
          ),
        ),
      },
    ],
    defaultAction: 'wait-retry',
  },
  {
    errorType: ErrorType.SERVER,
    detect: (error) => classifyError(error) === ErrorType.SERVER,
    actions: [
      {
        id: 'retry-later',
        label: 'Try Again Later',
        description:
          'Server is experiencing issues, try again in a few minutes',
        action: uiOnly('retry-later', () => {
          alert(
            'Server is temporarily unavailable. Please try again in a few minutes.',
          );
        }),
      },
      {
        id: 'contact-support',
        label: 'Contact Support',
        description: 'Report the issue to technical support',
        action: uiOnly('contact-support', () => {
          const subject = encodeURIComponent('Server Error Report');
          const body = encodeURIComponent(
            'I encountered a server error while using the application.',
          );
          window.open(
            `mailto:support@example.com?subject=${subject}&body=${body}`,
          );
        }),
      },
      {
        id: 'refresh-page',
        label: 'Refresh Page',
        description: 'Reload the page to try again',
        action: clientReload,
      },
    ],
    defaultAction: 'retry-later',
  },
  {
    errorType: ErrorType.VALIDATION,
    detect: (error) => classifyError(error) === ErrorType.VALIDATION,
    actions: [
      {
        id: 'review-input',
        label: 'Review Input',
        description: 'Check your input and try again',
        action: uiOnly('review-input', () => {
          alert(
            'Please review your input and correct any errors before trying again.',
          );
        }),
      },
      {
        id: 'reset-form',
        label: 'Reset Form',
        description: 'Clear the form and start over',
        action: () => {
          // This would need to be implemented per form
          console.log('Reset form action');
        },
      },
    ],
    defaultAction: 'review-input',
  },
  {
    errorType: ErrorType.CLIENT,
    detect: (error) => classifyError(error) === ErrorType.CLIENT,
    actions: [
      {
        id: 'refresh-page',
        label: 'Refresh Page',
        description: 'Reload the page to reset the application state',
        action: clientReload,
        automatic: true,
        delay: 1000,
      },
      {
        id: 'clear-cache',
        label: 'Clear Browser Cache',
        description: 'Clear browser cache and reload',
        action: uiOnly('clear-cache', () => {
          if ('caches' in window) {
            return caches
              .keys()
              .then((names) => {
                return Promise.all(names.map((name) => caches.delete(name)));
              })
              .then(clientReload);
          } else {
            clientReload();
          }
        }),
      },
    ],
    defaultAction: 'refresh-page',
  },
  {
    errorType: ErrorType.UNKNOWN,
    detect: (error) => classifyError(error) === ErrorType.UNKNOWN,
    actions: [
      {
        id: 'refresh-page',
        label: 'Refresh Page',
        description: 'Reload the page to try again',
        action: clientReload,
      },
      {
        id: 'report-bug',
        label: 'Report Bug',
        description: 'Report this unexpected error',
        action: uiOnly('report-bug', () => {
          const subject = encodeURIComponent('Bug Report');
          const body = encodeURIComponent(
            'I encountered an unexpected error while using the application.',
          );
          window.open(
            `mailto:support@example.com?subject=${subject}&body=${body}`,
          );
        }),
      },
    ],
    defaultAction: 'refresh-page',
  },
];

/**
 * Gets recovery actions for a specific error
 */
export function getRecoveryActions(error: Error): RecoveryAction[] {
  const errorType = classifyError(error);
  const strategy = recoveryStrategies.find((s) => s.errorType === errorType);
  return strategy?.actions || [];
}

/**
 * Gets the default recovery action for an error
 */
export function getDefaultRecoveryAction(error: Error): RecoveryAction | null {
  const errorType = classifyError(error);
  const strategy = recoveryStrategies.find((s) => s.errorType === errorType);

  if (!strategy) return null;

  const defaultActionId = strategy.defaultAction;
  if (!defaultActionId) return strategy.actions[0] || null;

  return strategy.actions.find((a) => a.id === defaultActionId) || null;
}

/**
 * Executes automatic recovery if available
 */
export async function attemptAutoRecovery(error: Error): Promise<boolean> {
  const defaultAction = getDefaultRecoveryAction(error);

  if (!defaultAction || !defaultAction.automatic) {
    return false;
  }

  try {
    if (defaultAction.delay) {
      await new Promise((resolve) => setTimeout(resolve, defaultAction.delay));
    }

    await defaultAction.action();
    return true;
  } catch (recoveryError) {
    console.error('Auto-recovery failed:', recoveryError);
    return false;
  }
}
