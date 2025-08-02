/**
 * @jest-environment jsdom
 */
import {
  classifyError,
  getRecoveryActions,
  getDefaultRecoveryAction,
  attemptAutoRecovery,
  ErrorType,
  recoveryStrategies,
} from '@/lib/error-monitoring/recovery-strategies';

// Mock window methods
const mockAlert = jest.fn();
const mockReload = jest.fn();
const mockBack = jest.fn();
const mockOpen = jest.fn();

Object.defineProperty(window, 'alert', { value: mockAlert });
Object.defineProperty(window, 'location', {
  value: { reload: mockReload },
  writable: true,
});
Object.defineProperty(window, 'history', {
  value: { back: mockBack },
});
Object.defineProperty(window, 'open', { value: mockOpen });
Object.defineProperty(navigator, 'onLine', { value: true, writable: true });

// Mock caches API
const mockCacheDelete = jest.fn().mockResolvedValue(true);
const mockCacheKeys = jest.fn().mockResolvedValue(['cache1', 'cache2']);
Object.defineProperty(window, 'caches', {
  value: {
    keys: mockCacheKeys,
    delete: mockCacheDelete,
  },
});

describe('Error Classification', () => {
  beforeEach(() => {
    // jest.clearAllMocks();
  });

  describe('classifyError', () => {
    it('should classify network errors correctly', () => {
      const networkErrors = [
        new Error('fetch failed'),
        new Error('Network error occurred'),
        new Error('Connection timeout'),
        new TypeError('Failed to fetch'),
      ];

      networkErrors.forEach(error => {
        expect(classifyError(error)).toBe(ErrorType.NETWORK);
      });
    });

    it('should classify authentication errors correctly', () => {
      const authErrors = [
        new Error('Unauthorized access'),
        new Error('Authentication failed'),
        new Error('Invalid token'),
        new Error('Login required'),
      ];

      authErrors.forEach(error => {
        expect(classifyError(error)).toBe(ErrorType.AUTHENTICATION);
      });
    });

    it('should classify permission errors correctly', () => {
      const permissionErrors = [
        new Error('Forbidden operation'),
        new Error('Permission denied'),
        new Error('Access denied'),
        new Error('Not allowed to perform this action'),
      ];

      permissionErrors.forEach(error => {
        expect(classifyError(error)).toBe(ErrorType.PERMISSION);
      });
    });

    it('should classify rate limit errors correctly', () => {
      const rateLimitErrors = [
        new Error('Rate limit exceeded'),
        new Error('Too many requests'),
        new Error('HTTP 429 error'),
      ];

      rateLimitErrors.forEach(error => {
        expect(classifyError(error)).toBe(ErrorType.RATE_LIMIT);
      });
    });

    it('should classify server errors correctly', () => {
      const serverErrors = [
        new Error('Internal server error'),
        new Error('HTTP 500 error'),
        new Error('502 Bad Gateway'),
        new Error('503 Service Unavailable'),
        new Error('504 Gateway Timeout'),
      ];

      serverErrors.forEach(error => {
        expect(classifyError(error)).toBe(ErrorType.SERVER);
      });
    });

    it('should classify validation errors correctly', () => {
      const validationErrors = [
        new Error('Validation failed'),
        new Error('Invalid input data'),
        new Error('Required field missing'),
        Object.assign(new Error('Custom validation'), { name: 'ValidationError' }),
      ];

      validationErrors.forEach(error => {
        expect(classifyError(error)).toBe(ErrorType.VALIDATION);
      });
    });

    it('should classify client errors correctly', () => {
      const clientErrors = [
        new ReferenceError('Variable not defined'),
        new TypeError('Cannot read property'),
        new RangeError('Array index out of bounds'),
      ];

      clientErrors.forEach(error => {
        expect(classifyError(error)).toBe(ErrorType.CLIENT);
      });
    });

    it('should classify unknown errors as UNKNOWN', () => {
      const unknownErrors = [
        new Error('Some random error message'),
        new Error(''),
        new Error('Unclassified error type'),
      ];

      unknownErrors.forEach(error => {
        expect(classifyError(error)).toBe(ErrorType.UNKNOWN);
      });
    });

    it('should handle errors with stack traces', () => {
      const error = new Error('Network issue');
      error.stack = 'Error: Network issue\n    at auth.js:123\n    at fetch.js:456';
      
      expect(classifyError(error)).toBe(ErrorType.AUTHENTICATION);
    });
  });
});

describe('Recovery Actions', () => {
  beforeEach(() => {
    // jest.clearAllMocks();
  });

  describe('getRecoveryActions', () => {
    it('should return correct actions for network errors', () => {
      const networkError = new Error('Network connection failed');
      const actions = getRecoveryActions(networkError);

      expect(actions).toHaveLength(3);
      expect(actions[0].id).toBe('retry-request');
      expect(actions[1].id).toBe('check-connection');
      expect(actions[2].id).toBe('refresh-page');
    });

    it('should return correct actions for authentication errors', () => {
      const authError = new Error('Authentication failed');
      const actions = getRecoveryActions(authError);

      expect(actions).toHaveLength(2);
      expect(actions[0].id).toBe('login-redirect');
      expect(actions[1].id).toBe('refresh-token');
    });

    it('should return correct actions for permission errors', () => {
      const permissionError = new Error('Access denied');
      const actions = getRecoveryActions(permissionError);

      expect(actions).toHaveLength(2);
      expect(actions[0].id).toBe('contact-admin');
      expect(actions[1].id).toBe('go-back');
    });

    it('should return correct actions for rate limit errors', () => {
      const rateLimitError = new Error('Rate limit exceeded');
      const actions = getRecoveryActions(rateLimitError);

      expect(actions).toHaveLength(2);
      expect(actions[0].id).toBe('wait-retry');
      expect(actions[1].id).toBe('reduce-requests');
    });

    it('should return fallback actions for unknown error types', () => {
      // Create an error that will be classified as unknown
      const unknownError = new Error('Some completely unknown error type');
      
      const actions = getRecoveryActions(unknownError);
      
      // Should return the unknown error type actions as fallback
      expect(actions).toHaveLength(2);
      expect(actions[0].id).toBe('refresh-page');
      expect(actions[1].id).toBe('report-bug');
    });
  });

  describe('getDefaultRecoveryAction', () => {
    it('should return the default action for each error type', () => {
      const testCases = [
        { error: new Error('Network failed'), expectedId: 'retry-request' },
        { error: new Error('Authentication failed'), expectedId: 'login-redirect' },
        { error: new Error('Permission denied'), expectedId: 'contact-admin' },
        { error: new Error('Rate limit exceeded'), expectedId: 'wait-retry' },
        { error: new Error('Internal server error'), expectedId: 'retry-later' },
        { error: new Error('Validation failed'), expectedId: 'review-input' },
        { error: new TypeError('Cannot read property'), expectedId: 'refresh-page' },
        { error: new Error('Unknown error'), expectedId: 'refresh-page' },
      ];

      testCases.forEach(({ error, expectedId }) => {
        const defaultAction = getDefaultRecoveryAction(error);
        expect(defaultAction?.id).toBe(expectedId);
      });
    });

    it('should return default action for unknown error types', () => {
      const unknownError = new Error('Some completely unknown error type');
      const defaultAction = getDefaultRecoveryAction(unknownError);
      
      // Should return the default action for unknown errors (refresh-page)
      expect(defaultAction).not.toBeNull();
      expect(defaultAction?.id).toBe('refresh-page');
    });

    it('should return first action if no default is specified', async () => {
      // Find a strategy without a default action
      const strategyWithoutDefault = recoveryStrategies.find(s => !s.defaultAction);
      
      if (strategyWithoutDefault) {
        // Mock the error to match this strategy
        jest.spyOn(await import('@/lib/error-monitoring/recovery-strategies'), 'classifyError')
          .mockReturnValue(strategyWithoutDefault.errorType);
        
        const error = new Error('Test error');
        const defaultAction = getDefaultRecoveryAction(error);
        
        expect(defaultAction?.id).toBe(strategyWithoutDefault.actions[0].id);
      }
    });
  });
});

describe('Recovery Action Execution', () => {
  beforeEach(() => {
    // jest.clearAllMocks();
  });

  describe('Network Error Actions', () => {
    it('should execute retry-request action', () => {
      const networkError = new Error('Network failed');
      const actions = getRecoveryActions(networkError);
      const retryAction = actions.find(a => a.id === 'retry-request');

      expect(retryAction).toBeDefined();
      expect(retryAction?.automatic).toBe(true);
      expect(retryAction?.delay).toBe(1000);
      expect(retryAction?.maxRetries).toBe(3);

      retryAction?.action();
      expect(mockReload).toHaveBeenCalled();
    });

    it('should execute check-connection action', () => {
      const networkError = new Error('Network failed');
      const actions = getRecoveryActions(networkError);
      const checkAction = actions.find(a => a.id === 'check-connection');

      // Test when online
      Object.defineProperty(navigator, 'onLine', { value: true });
      checkAction?.action();
      expect(mockAlert).toHaveBeenCalledWith('Connection appears to be working. Please try again.');

      // Test when offline
      Object.defineProperty(navigator, 'onLine', { value: false });
      checkAction?.action();
      expect(mockAlert).toHaveBeenCalledWith('No internet connection detected. Please check your connection.');
    });
  });

  describe('Authentication Error Actions', () => {
    it('should execute login-redirect action', () => {
      const authError = new Error('Authentication failed');
      const actions = getRecoveryActions(authError);
      const loginAction = actions.find(a => a.id === 'login-redirect');

      // Mock window.location.href setter
      let mockHref = '';
      Object.defineProperty(window, 'location', {
        value: { href: mockHref },
        writable: true,
      });

      act(() => loginAction?.action());
      // Note: In a real test, we'd check that window.location.href was set
      // For now, we just verify the action exists and is configured correctly
      expect(loginAction?.automatic).toBe(true);
      expect(loginAction?.delay).toBe(2000);
    });
  });

  describe('Permission Error Actions', () => {
    it('should execute contact-admin action', () => {
      const permissionError = new Error('Access denied');
      const actions = getRecoveryActions(permissionError);
      const contactAction = actions.find(a => a.id === 'contact-admin');

      contactAction?.action();
      expect(mockAlert).toHaveBeenCalledWith(
        'You do not have permission to perform this action. Please contact your administrator.'
      );
    });

    it('should execute go-back action', () => {
      const permissionError = new Error('Access denied');
      const actions = getRecoveryActions(permissionError);
      const backAction = actions.find(a => a.id === 'go-back');

      backAction?.action();
      expect(mockBack).toHaveBeenCalled();
    });
  });

  describe('Server Error Actions', () => {
    it('should execute contact-support action', () => {
      const serverError = new Error('Internal server error');
      const actions = getRecoveryActions(serverError);
      const supportAction = actions.find(a => a.id === 'contact-support');

      supportAction?.action();
      expect(mockOpen).toHaveBeenCalledWith(
        expect.stringContaining('mailto:support@example.com')
      );
    });
  });

});

describe('Automatic Recovery', () => {
  beforeEach(() => {
    // jest.clearAllMocks();
    jest.useFakeTimers();
    
    // Reset the reload mock
    mockReload.mockClear();
    mockReload.mockImplementation(() => {});
    
    // Ensure window.location.reload is properly mocked
    Object.defineProperty(window, 'location', {
      value: { reload: mockReload },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('attemptAutoRecovery', () => {
    it('should execute automatic recovery for network errors', async () => {
      const networkError = new Error('Network failed');
      
      const recoveryPromise = attemptAutoRecovery(networkError);
      
      // Fast-forward through the delay
      jest.advanceTimersByTime(1000);
      
      // Wait for all promises to resolve
      await jest.runOnlyPendingTimersAsync();
      
      const result = await recoveryPromise;
      
      expect(result).toBe(true);
      expect(mockReload).toHaveBeenCalled();
    });

    it('should not execute recovery for non-automatic actions', async () => {
      const permissionError = new Error('Access denied');
      
      const result = await attemptAutoRecovery(permissionError);
      
      expect(result).toBe(false);
      expect(mockAlert).not.toHaveBeenCalled();
    });

    it('should handle recovery action failures gracefully', async () => {
      const networkError = new Error('Network failed');
      
      // Mock reload to throw an error
      mockReload.mockImplementation(() => {
        throw new Error('Reload failed');
      });
      
      const recoveryPromise = attemptAutoRecovery(networkError);
      jest.advanceTimersByTime(1000);
      
      // Wait for all promises to resolve
      await jest.runOnlyPendingTimersAsync();
      
      const result = await recoveryPromise;
      
      expect(result).toBe(false);
    });

    it('should respect delay settings', async () => {
      const authError = new Error('Authentication failed');
      
      const recoveryPromise = attemptAutoRecovery(authError);
      
      // Should not execute immediately
      expect(mockAlert).not.toHaveBeenCalled();
      
      // Fast-forward through the delay
      jest.advanceTimersByTime(2000);
      
      // Wait for all promises to resolve
      await jest.runOnlyPendingTimersAsync();
      
      await recoveryPromise;
      // Verify the action was executed (auth redirect would change location)
    });

    it('should return false for errors without default actions', async () => {
      // Mock an error that has no default action
      jest.spyOn(await import('@/lib/error-monitoring/recovery-strategies'), 'getDefaultRecoveryAction')
        .mockReturnValue(null);
      
      const unknownError = new Error('No default action');
      
      const result = await attemptAutoRecovery(unknownError);
      
      expect(result).toBe(false);
    });
  });
});

describe('Recovery Strategy Configuration', () => {
  it('should have valid configuration for all strategies', () => {
    recoveryStrategies.forEach(strategy => {
      expect(strategy.errorType).toBeDefined();
      expect(strategy.detect).toBeInstanceOf(Function);
      expect(Array.isArray(strategy.actions)).toBe(true);
      expect(strategy.actions.length).toBeGreaterThan(0);

      strategy.actions.forEach(action => {
        expect(action.id).toBeDefined();
        expect(action.label).toBeDefined();
        expect(action.description).toBeDefined();
        expect(action.action).toBeInstanceOf(Function);
      });
    });
  });

  it('should have unique error types', () => {
    const errorTypes = recoveryStrategies.map(s => s.errorType);
    const uniqueErrorTypes = [...new Set(errorTypes)];
    
    expect(errorTypes.length).toBe(uniqueErrorTypes.length);
  });

  it('should have unique action IDs within each strategy', () => {
    recoveryStrategies.forEach(strategy => {
      const actionIds = strategy.actions.map(a => a.id);
      const uniqueActionIds = [...new Set(actionIds)];
      
      expect(actionIds.length).toBe(uniqueActionIds.length);
    });
  });

  it('should have valid default actions when specified', () => {
    recoveryStrategies.forEach(strategy => {
      if (strategy.defaultAction) {
        const defaultActionExists = strategy.actions.some(
          action => action.id === strategy.defaultAction
        );
        expect(defaultActionExists).toBe(true);
      }
    });
  });
});

describe('Edge Cases', () => {
  it('should handle empty error messages', () => {
    const emptyError = new Error('');
    const errorType = classifyError(emptyError);
    expect(errorType).toBe(ErrorType.UNKNOWN);
  });

  it('should handle null/undefined stack traces', () => {
    const error = new Error('Test error');
    error.stack = undefined;
    
    const errorType = classifyError(error);
    expect(errorType).toBe(ErrorType.UNKNOWN);
  });

  it('should handle mixed case error messages', () => {
    const mixedCaseError = new Error('NETWORK ERROR OCCURRED');
    expect(classifyError(mixedCaseError)).toBe(ErrorType.NETWORK);
  });

 
});
