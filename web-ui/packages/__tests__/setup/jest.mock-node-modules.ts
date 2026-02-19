import { createElement } from '@compliance-theater/types/react';
import { withJestTestExtensions } from '../jest.test-extensions';

const safeMock = <T extends object>(moduleName: string, factory: () => T): T => {
  try {
    return jest.mock(moduleName, factory);
  } catch (error) {
    withJestTestExtensions().addMockWarning(moduleName);
    return jest.fn(() => ({}) as T)();
  }
}


safeMock('google-auth-library');
safeMock('googleapis');

// Mocking modules before imports
safeMock('postgres', () => {
  return {
    default: jest.fn().mockImplementation(() => {
      return jest.fn(() => Promise.resolve({ rows: [] }));
    }),
  };
});

// Mock Next.js router
safeMock('@compliance-theater/types/next/navigation', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
  })),
  usePathname: jest.fn(() => '/test'),
  useSearchParams: jest.fn(() => new URLSearchParams()),
}));

safeMock('@/components/general/telemetry/track-with-app-insight', () => ({
  TrackWithAppInsight: jest.fn((props: any) => {
    const { children, ...rest } = props;
    return createElement('div', rest, children);
  }),
}));

safeMock('@microsoft/applicationinsights-react-js', () => ({
  withAITracking: (_plugin: any, Component: any) => Component,
}));
safeMock('@mui/material/ButtonBase/TouchRipple', () => {
  return function MockTouchRipple() {
    return null;
  };
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let ErrorBoundary: any = jest.fn(() => ({}) as T)();

safeMock('react-error-boundary', () => {
  ErrorBoundary = require('./jest.mock-error-boundary').default;
  return {
    ErrorBoundary,
    FallbackComponent: ({ error }: { error?: Error }) => {
      return createElement('div', { role: 'alert' }, error?.message);
    },
  };
});
