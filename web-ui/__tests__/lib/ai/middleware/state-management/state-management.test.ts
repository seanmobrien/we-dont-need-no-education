/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * @fileoverview State Management Protocol Tests
 *
 * Tests for the middleware state management protocol implementation.
 */

import {
  STATE_PROTOCOL,
  StateManagementMiddleware,
  createStateManagementMiddleware,
  createStatefulMiddleware,
} from '@/lib/ai/middleware/state-management';

describe('State Management Protocol', () => {
  describe('StateManagementMiddleware', () => {
    it('should have the correct middleware ID', () => {
      const middleware = createStateManagementMiddleware();
      expect(middleware.getMiddlewareId()).toBe('state-manager');
    });

    it('should provide middleware implementation', () => {
      const middleware = createStateManagementMiddleware();
      expect(middleware.middleware).toBeDefined();
      expect(middleware.middleware.wrapGenerate).toBeDefined();
    });
  });

  describe('createStatefulMiddleware', () => {
    const mockOriginalMiddleware = {
      wrapGenerate: jest.fn(),
      wrapStream: jest.fn(),
      transformParams: jest.fn(),
    };

    afterEach(() => {
      jest.clearAllMocks();
    });

    it('should create a stateful middleware wrapper', () => {
      const wrapper = createStatefulMiddleware({
        middlewareId: 'test-middleware',
        originalMiddleware: mockOriginalMiddleware,
      });

      expect(wrapper).toBeDefined();
      expect(wrapper.wrapGenerate).toBeDefined();
      expect(wrapper.wrapStream).toBeDefined();
      expect(wrapper.transformParams).toBeDefined();
    });

    it('should pass through to original middleware for normal requests', async () => {
      mockOriginalMiddleware.wrapGenerate.mockResolvedValue('test-result');

      const wrapper = createStatefulMiddleware({
        middlewareId: 'test-middleware',
        originalMiddleware: mockOriginalMiddleware,
      });

      const mockNext = jest.fn();
      const mockParams = { prompt: 'normal request' };
      const mockModel = { modelId: 'test-model' };

      await (wrapper.wrapGenerate as any)({
        model: mockModel,
        params: mockParams,
        doGenerate: mockNext,
      });

      expect(mockOriginalMiddleware.wrapGenerate).toHaveBeenCalledWith({
        model: mockModel,
        params: mockParams,
        doGenerate: mockNext,
      });
    });

    it('should handle state collection requests', async () => {
      const stateCollection = new Map();
      const mockParams = {
        prompt: 'normal request',
        [STATE_PROTOCOL.RESULTS]: stateCollection,
      };
      const mockModel = { modelId: 'test-model' };
      const mockNext = jest.fn();

      const wrapper = createStatefulMiddleware({
        middlewareId: 'test-middleware',
        originalMiddleware: {
          ...mockOriginalMiddleware,
          serializeState: () => Promise.resolve({ test: 'state' }),
          deserializeState() {
            return Promise.resolve();
          },
        },
      });

      await (wrapper.wrapGenerate as any)({
        model: mockModel,
        params: mockParams,
        doGenerate: mockNext,
      });

      expect(stateCollection.has('test-middleware')).toBe(true);
      expect(stateCollection.get('test-middleware')).toEqual({ test: 'state' });
      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle state restoration requests', async () => {
      const stateData = new Map([
        ['test-middleware', { test: 'restored-state' }],
      ]);
      const mockDeserialize = jest.fn();
      const mockParams = {
        prompt: 'normal request',
        [STATE_PROTOCOL.RESTORE]: true,
        stateData,
      };
      const mockModel = { modelId: 'test-model' };
      const mockNext = jest.fn();

      const wrapper = createStatefulMiddleware({
        middlewareId: 'test-middleware',
        originalMiddleware: {
          ...mockOriginalMiddleware,
          deserializeState: mockDeserialize,
        },
      });

      await (wrapper.wrapGenerate as any)({
        model: mockModel,
        params: mockParams,
        doGenerate: mockNext,
      });

      expect(mockDeserialize).toHaveBeenCalledWith({ test: 'restored-state' });
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('createSimpleStatefulMiddleware', () => {
    it('should create a simple stateful middleware without state handlers', () => {
      const mockOriginalMiddleware = {
        wrapGenerate: jest.fn(),
      };

      const wrapper = StateManagementMiddleware.Instance.basicMiddlewareWrapper(
        {
          middlewareId: 'simple-middleware',
          middleware: mockOriginalMiddleware,
        },
      );

      expect(wrapper).toBeDefined();
      expect(wrapper.wrapGenerate).toBeDefined();
    });
  });

  describe('STATE_PROTOCOL constants', () => {
    it('should have the correct protocol constants', () => {
      expect(STATE_PROTOCOL.COLLECT).toBe('__COLLECT_MIDDLEWARE_STATE__');
      expect(STATE_PROTOCOL.RESTORE).toBe('__RESTORE_MIDDLEWARE_STATE__');
      expect(STATE_PROTOCOL.RESULTS).toBe('__MIDDLEWARE_STATE_RESULT__');
    });
  });
});
