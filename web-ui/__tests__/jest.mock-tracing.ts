 
import { trace } from '@opentelemetry/api';

export const createMockTracer = () => {
  let activeSpy: jest.SpyInstance | undefined;
  const spans = new Array<any>();
  const createMockSpan = () => {
    const mockSpan = {
      setAttribute: jest.fn(),
      setStatus: jest.fn(),
      recordException: jest.fn(),
      end: jest.fn(),
    };
    spans.push(mockSpan);
    return mockSpan;
  };

  const thisTracer = {
    // Behave like OTel: startActiveSpan(name, [options], callback)
    startActiveSpan: jest
      .fn()
      .mockImplementation(
        (name: string, arg2?: any, arg3?: any, arg4?: any) => {
          const cb = [arg2, arg3, arg4].find((a) => typeof a === 'function');
          const span = createMockSpan();
          if (cb) {
            return (cb as (span: any) => any)(span);
          }
          // Fallback: return a span if no callback supplied
          return span;
        },
      ),
    startSpan: jest.fn().mockImplementation(createMockSpan),
    setup: () => {
      if (activeSpy) return; // already setup
      activeSpy = jest.spyOn(trace, 'getTracer').mockReturnValue(thisTracer);
    },
    dispose: () => {
      activeSpy?.mockRestore();
      activeSpy = undefined;
      while (spans.length) {
        spans.pop();
      }
    },
  };
  return thisTracer;
};
