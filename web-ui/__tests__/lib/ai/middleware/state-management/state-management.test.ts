/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * @fileoverview State Management Protocol Tests
 *
 * Tests for the middleware state management protocol implementation.
 */

import {
  STATE_PROTOCOL,
  MiddlewareStateManager,
} from '/lib/ai/middleware/state-management';

describe('State Management Protocol', () => {
  describe('MiddlewareStateManager', () => {
    it('should have the correct middleware ID', () => {
      const middleware = MiddlewareStateManager.Instance;
      expect(middleware.getMiddlewareId()).toBe('state-manager');
    });

    it('should provide middleware implementation', () => {
      const middleware =
        MiddlewareStateManager.Instance.getMiddlewareInstance();
      expect(middleware).toBeDefined();
      expect(middleware.wrapGenerate).toBeDefined();
    });
  });

  describe('MiddlewareStateManager.Instance.statefulMiddlewareWrapper', () => {
    let mockOriginalMiddleware = {
      wrapGenerate: jest.fn((x) => x.doGenerate()),
      wrapStream: jest.fn(),
      transformParams: jest.fn().mockImplementation((x) => x),
    };

    beforeEach(() => {
      mockOriginalMiddleware = {
        wrapGenerate: jest.fn(),
        wrapStream: jest.fn(),
        transformParams: jest.fn().mockImplementation((x) => x),
      };
    });
    afterEach(() => {
      // jest.clearAllMocks();
    });

    it('should create a stateful middleware wrapper', () => {
      const wrapper = MiddlewareStateManager.Instance.statefulMiddlewareWrapper(
        {
          middlewareId: 'test-middleware',
          middleware: mockOriginalMiddleware,
        },
      );

      expect(wrapper).toBeDefined();
      expect(wrapper.wrapGenerate).toBeDefined();
      expect(wrapper.wrapStream).toBeDefined();
      expect(wrapper.transformParams).toBeDefined();
    });

    it('should pass through to original middleware for normal requests', async () => {
      mockOriginalMiddleware.wrapGenerate.mockResolvedValue('test-result');

      const wrapper = MiddlewareStateManager.Instance.statefulMiddlewareWrapper(
        {
          middlewareId: 'test-middleware',
          middleware: mockOriginalMiddleware,
        },
      );

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
  });

  describe('basicMiddlewareWrapper', () => {
    it('should create a simple stateful middleware without state handlers', () => {
      const mockOriginalMiddleware = {
        wrapGenerate: jest.fn(),
      };

      const wrapper = MiddlewareStateManager.Instance.basicMiddlewareWrapper({
        middlewareId: 'simple-middleware',
        middleware: mockOriginalMiddleware,
      });

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
