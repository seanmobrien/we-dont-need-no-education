import { createElement } from 'react';
jest.mock('google-auth-library');
jest.mock('googleapis');
jest.mock('postgres', () => {
    return {
        default: jest.fn().mockImplementation(() => {
            return jest.fn(() => Promise.resolve({ rows: [] }));
        }),
    };
});
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
try {
    jest.mock('@/components/general/telemetry/track-with-app-insight', () => ({
        TrackWithAppInsight: jest.fn((props) => {
            const { children, ...rest } = props;
            return createElement('div', rest, children);
        }),
    }));
}
catch {
}
jest.mock('@microsoft/applicationinsights-react-js', () => ({
    withAITracking: (_plugin, Component) => Component,
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
        FallbackComponent: ({ error }) => {
            return createElement('div', { role: 'alert' }, error?.message);
        },
    };
});
//# sourceMappingURL=jest.mock-node-modules.js.map