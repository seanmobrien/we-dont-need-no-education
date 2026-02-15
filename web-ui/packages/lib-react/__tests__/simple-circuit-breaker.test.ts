import { SimpleCircuitBreaker } from '../src/simple-circuit-breaker';

describe('SimpleCircuitBreaker', () => {
  let circuitBreaker: SimpleCircuitBreaker;
  let mockOperation: jest.Mock;

  beforeEach(() => {
    jest.useFakeTimers();
    circuitBreaker = new SimpleCircuitBreaker(3, 1000); // 3 failures, 1 second timeout
    mockOperation = jest.fn();
  });

  describe('constructor', () => {
    it('should create instance with default values', () => {
      const defaultBreaker = new SimpleCircuitBreaker();
      expect(defaultBreaker.getState()).toBe('CLOSED');
    });

    it('should create instance with custom values', () => {
      const customBreaker = new SimpleCircuitBreaker(10, 5000);
      expect(customBreaker.getState()).toBe('CLOSED');
    });
  });

  describe('getState', () => {
    it('should return CLOSED state initially', () => {
      expect(circuitBreaker.getState()).toBe('CLOSED');
    });
  });

  describe('execute - CLOSED state behavior', () => {
    it('should execute operation successfully when circuit is CLOSED', async () => {
      const expectedResult = { data: 'success' };
      mockOperation.mockResolvedValue(expectedResult);

      const result = await circuitBreaker.execute(mockOperation);

      expect(result).toEqual(expectedResult);
      expect(mockOperation).toHaveBeenCalledTimes(1);
      expect(circuitBreaker.getState()).toBe('CLOSED');
    });

    it('should handle operation failure and increment failure count', async () => {
      const error = new Error('Operation failed');
      mockOperation.mockRejectedValue(error);

      await expect(circuitBreaker.execute(mockOperation)).rejects.toThrow(
        'Operation failed',
      );
      expect(mockOperation).toHaveBeenCalledTimes(1);
      expect(circuitBreaker.getState()).toBe('CLOSED'); // Still closed after 1 failure
    });

    it('should reset failure count on successful operation', async () => {
      const error = new Error('Temporary failure');
      const successData = { data: 'success' };

      // First failure
      mockOperation.mockRejectedValueOnce(error);
      await expect(circuitBreaker.execute(mockOperation)).rejects.toThrow(
        'Temporary failure',
      );
      expect(circuitBreaker.getState()).toBe('CLOSED');

      // Success should reset failure count
      mockOperation.mockResolvedValueOnce(successData);
      const result = await circuitBreaker.execute(mockOperation);
      expect(result).toEqual(successData);
      expect(circuitBreaker.getState()).toBe('CLOSED');

      // Should be able to handle more failures before opening
      mockOperation.mockRejectedValue(error);
      for (let i = 0; i < 2; i++) {
        await expect(circuitBreaker.execute(mockOperation)).rejects.toThrow(
          'Temporary failure',
        );
        expect(circuitBreaker.getState()).toBe('CLOSED');
      }
    });
  });

  describe('execute - OPEN state behavior', () => {
    beforeEach(async () => {
      // Trip the circuit breaker by causing 3 failures
      const error = new Error('Service unavailable');
      mockOperation.mockRejectedValue(error);

      for (let i = 0; i < 3; i++) {
        await expect(circuitBreaker.execute(mockOperation)).rejects.toThrow(
          'Service unavailable',
        );
      }
      expect(circuitBreaker.getState()).toBe('OPEN');
      mockOperation.mockClear();
    });

    it('should transition to OPEN state after threshold failures', () => {
      expect(circuitBreaker.getState()).toBe('OPEN');
    });

    it('should fail fast when circuit is OPEN and timeout has not elapsed', async () => {
      await expect(circuitBreaker.execute(mockOperation)).rejects.toThrow(
        'Circuit breaker is OPEN',
      );
      expect(mockOperation).not.toHaveBeenCalled();
      expect(circuitBreaker.getState()).toBe('OPEN');
    });

    it('should transition to HALF_OPEN after timeout period', async () => {
      // Fast-forward time past the timeout period
      jest.advanceTimersByTime(1100);

      const successData = { data: 'recovery' };
      mockOperation.mockResolvedValue(successData);

      const result = await circuitBreaker.execute(mockOperation);

      expect(result).toEqual(successData);
      expect(mockOperation).toHaveBeenCalledTimes(1);
      expect(circuitBreaker.getState()).toBe('CLOSED'); // Successful operation closes circuit
    });

    it('should return to OPEN state if operation fails during HALF_OPEN', async () => {
      // Fast-forward time past the timeout period
      jest.advanceTimersByTime(1100);

      const error = new Error('Still failing');
      mockOperation.mockRejectedValue(error);

      await expect(circuitBreaker.execute(mockOperation)).rejects.toThrow(
        'Still failing',
      );
      expect(mockOperation).toHaveBeenCalledTimes(1);
      expect(circuitBreaker.getState()).toBe('OPEN');
    });
  });

  describe('execute - HALF_OPEN state behavior', () => {
    beforeEach(async () => {
      // Trip the circuit breaker
      const error = new Error('Service down');
      mockOperation.mockRejectedValue(error);

      for (let i = 0; i < 3; i++) {
        await expect(circuitBreaker.execute(mockOperation)).rejects.toThrow(
          'Service down',
        );
      }
      expect(circuitBreaker.getState()).toBe('OPEN');

      // Fast-forward time to trigger HALF_OPEN on next call
      jest.advanceTimersByTime(1100);
      mockOperation.mockClear();
    });

    it('should close circuit on successful operation in HALF_OPEN state', async () => {
      const successData = { data: 'service recovered' };
      mockOperation.mockResolvedValue(successData);

      const result = await circuitBreaker.execute(mockOperation);

      expect(result).toEqual(successData);
      expect(circuitBreaker.getState()).toBe('CLOSED');
    });

    it('should open circuit on failed operation in HALF_OPEN state', async () => {
      const error = new Error('Service still down');
      mockOperation.mockRejectedValue(error);

      await expect(circuitBreaker.execute(mockOperation)).rejects.toThrow(
        'Service still down',
      );
      expect(circuitBreaker.getState()).toBe('OPEN');
    });
  });

  describe('execute - error propagation', () => {
    it('should propagate original error from operation', async () => {
      const customError = new Error('Database connection timeout');
      customError.name = 'DatabaseError';
      mockOperation.mockRejectedValue(customError);

      await expect(circuitBreaker.execute(mockOperation)).rejects.toThrow(
        'Database connection timeout',
      );
      await expect(circuitBreaker.execute(mockOperation)).rejects.toMatchObject(
        {
          name: 'DatabaseError',
          message: 'Database connection timeout',
        },
      );
    });

    it('should distinguish between circuit breaker errors and operation errors', async () => {
      // First, trip the circuit
      const serviceError = new Error('Service error');
      mockOperation.mockRejectedValue(serviceError);

      for (let i = 0; i < 3; i++) {
        await expect(circuitBreaker.execute(mockOperation)).rejects.toThrow(
          'Service error',
        );
      }

      // Now circuit is open, should get circuit breaker error
      await expect(circuitBreaker.execute(mockOperation)).rejects.toThrow(
        'Circuit breaker is OPEN',
      );
    });
  });

  describe('execute - generic type support', () => {
    it('should preserve return type of operation', async () => {
      interface UserData {
        id: number;
        name: string;
        email: string;
      }

      const userData: UserData = {
        id: 1,
        name: 'John Doe',
        email: 'john@example.com',
      };

      mockOperation.mockResolvedValue(userData);

      const result = await circuitBreaker.execute<UserData>(mockOperation);

      expect(result).toEqual(userData);
      expect(result.id).toBe(1);
      expect(result.name).toBe('John Doe');
      expect(result.email).toBe('john@example.com');
    });

    it('should work with primitive return types', async () => {
      mockOperation.mockResolvedValue('simple string');
      const stringResult = await circuitBreaker.execute<string>(mockOperation);
      expect(stringResult).toBe('simple string');

      mockOperation.mockResolvedValue(42);
      const numberResult = await circuitBreaker.execute<number>(mockOperation);
      expect(numberResult).toBe(42);

      mockOperation.mockResolvedValue(true);
      const booleanResult =
        await circuitBreaker.execute<boolean>(mockOperation);
      expect(booleanResult).toBe(true);
    });
  });

  describe('execute - edge cases', () => {
    it('should handle operations that throw synchronously', async () => {
      const syncError = new Error('Synchronous error');
      mockOperation.mockImplementation(() => {
        throw syncError;
      });

      await expect(circuitBreaker.execute(mockOperation)).rejects.toThrow(
        'Synchronous error',
      );
      expect(circuitBreaker.getState()).toBe('CLOSED'); // First failure, still closed
    });

    it('should handle operations that return undefined', async () => {
      mockOperation.mockResolvedValue(undefined);

      const result = await circuitBreaker.execute(mockOperation);
      expect(result).toBeUndefined();
      expect(circuitBreaker.getState()).toBe('CLOSED');
    });

    it('should handle operations that return null', async () => {
      mockOperation.mockResolvedValue(null);

      const result = await circuitBreaker.execute(mockOperation);
      expect(result).toBeNull();
      expect(circuitBreaker.getState()).toBe('CLOSED');
    });

    it('should handle multiple consecutive successful operations', async () => {
      const results = ['result1', 'result2', 'result3'];
      mockOperation.mockResolvedValueOnce(results[0]);
      mockOperation.mockResolvedValueOnce(results[1]);
      mockOperation.mockResolvedValueOnce(results[2]);

      for (let i = 0; i < 3; i++) {
        const result = await circuitBreaker.execute(mockOperation);
        expect(result).toBe(results[i]);
        expect(circuitBreaker.getState()).toBe('CLOSED');
      }
    });
  });

  describe('integration scenarios', () => {
    it('should handle mixed success and failure patterns', async () => {
      const error = new Error('Intermittent failure');
      const success = { status: 'ok' };

      // Success -> Failure -> Success -> Failure -> Failure -> Failure (should open)
      mockOperation.mockResolvedValueOnce(success);
      await circuitBreaker.execute(mockOperation);
      expect(circuitBreaker.getState()).toBe('CLOSED');

      mockOperation.mockRejectedValueOnce(error);
      await expect(circuitBreaker.execute(mockOperation)).rejects.toThrow(
        'Intermittent failure',
      );
      expect(circuitBreaker.getState()).toBe('CLOSED');

      mockOperation.mockResolvedValueOnce(success);
      await circuitBreaker.execute(mockOperation);
      expect(circuitBreaker.getState()).toBe('CLOSED');

      // Now three consecutive failures should open the circuit
      mockOperation.mockRejectedValue(error);
      for (let i = 0; i < 3; i++) {
        await expect(circuitBreaker.execute(mockOperation)).rejects.toThrow(
          'Intermittent failure',
        );
      }
      expect(circuitBreaker.getState()).toBe('OPEN');
    });

    it('should handle rapid successive calls when circuit is open', async () => {
      // Trip the circuit
      const error = new Error('Service down');
      mockOperation.mockRejectedValue(error);

      for (let i = 0; i < 3; i++) {
        await expect(circuitBreaker.execute(mockOperation)).rejects.toThrow(
          'Service down',
        );
      }
      expect(circuitBreaker.getState()).toBe('OPEN');

      // Multiple rapid calls should all fail fast
      const promises = Array(5)
        .fill(null)
        .map(() =>
          circuitBreaker.execute(mockOperation).catch((e) => e.message),
        );

      const results = await Promise.all(promises);
      results.forEach((result) => {
        expect(result).toBe('Circuit breaker is OPEN');
      });

      // Operation should not have been called during open state
      expect(mockOperation).toHaveBeenCalledTimes(3); // Only the initial 3 calls that tripped it
    });

    it('should properly recover after extended downtime', async () => {
      // Trip the circuit
      const error = new Error('Extended outage');
      mockOperation.mockRejectedValue(error);

      for (let i = 0; i < 3; i++) {
        await expect(circuitBreaker.execute(mockOperation)).rejects.toThrow(
          'Extended outage',
        );
      }
      expect(circuitBreaker.getState()).toBe('OPEN');

      // Fast-forward time longer than timeout period
      jest.advanceTimersByTime(1500);

      // Service recovers
      const recoveryData = { status: 'service restored' };
      mockOperation.mockResolvedValue(recoveryData);

      const result = await circuitBreaker.execute(mockOperation);
      expect(result).toEqual(recoveryData);
      expect(circuitBreaker.getState()).toBe('CLOSED');

      // Should continue to work normally
      const result2 = await circuitBreaker.execute(mockOperation);
      expect(result2).toEqual(recoveryData);
      expect(circuitBreaker.getState()).toBe('CLOSED');
    });
  });

  describe('performance characteristics', () => {
    it('should handle high-frequency operations efficiently', async () => {
      mockOperation.mockResolvedValue('fast response');

      const startTime = Date.now();
      const promises = Array(100)
        .fill(null)
        .map(() => circuitBreaker.execute(mockOperation));
      await Promise.all(promises);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(1000); // Should complete quickly
      expect(mockOperation).toHaveBeenCalledTimes(100);
      expect(circuitBreaker.getState()).toBe('CLOSED');
    });

    it('should provide fast failure when circuit is open', async () => {
      // Trip the circuit
      const error = new Error('Slow service');
      mockOperation.mockRejectedValue(error);

      for (let i = 0; i < 3; i++) {
        await expect(circuitBreaker.execute(mockOperation)).rejects.toThrow(
          'Slow service',
        );
      }
      expect(circuitBreaker.getState()).toBe('OPEN');

      // Fast failure should not call the slow operation at all
      const startTime = Date.now();
      await expect(circuitBreaker.execute(mockOperation)).rejects.toThrow(
        'Circuit breaker is OPEN',
      );
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(50); // Should fail very quickly
      // Operation should not have been called again (only the initial 3 calls)
      expect(mockOperation).toHaveBeenCalledTimes(3);
    });
  });
});
