import { createElement } from 'react';

jest.mock('google-auth-library');
jest.mock('googleapis');

// Mocking modules before imports
jest.mock('postgres', () => {
  return {
    default: jest.fn().mockImplementation(() => {
      return jest.fn(() => Promise.resolve({ rows: [] }));
    }),
  };
});

// Mock Next.js router
jest.mock('next/navigation', () => ({
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

try{
  jest.mock('@/components/general/telemetry/track-with-app-insight', () => ({
    TrackWithAppInsight: jest.fn((props: any) => {
      const { children, ...rest } = props;
      return createElement('div', rest, children);
    }),
  }));
}catch{

}

jest.mock('@microsoft/applicationinsights-react-js', () => ({
  withAITracking: (_plugin: any, Component: any) => Component,
}));
jest.mock('@mui/material/ButtonBase/TouchRipple', () => {
  return function MockTouchRipple() {
    return null;
  };
});
const ErrorBoundary = jest.requireActual('./jest.mock-error-boundary').default;

jest.mock('react-error-boundary', () => {
  return {
    ErrorBoundary,
    FallbackComponent: ({ error }: { error?: Error }) => {
      return createElement('div', { role: 'alert' }, error?.message);
    },
  };
});
