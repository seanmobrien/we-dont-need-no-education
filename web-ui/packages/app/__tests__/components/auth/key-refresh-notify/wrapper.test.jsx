import React from 'react';
import { render } from '@/__tests__/test-utils';
import { KeyRefreshNotifyWrapper as KeyRefreshWrapper } from '@/components/auth/key-refresh-notify/wrapper';
describe('KeyRefreshWrapper', () => {
    it('renders with default state snapshot', () => {
        const { container } = render(<KeyRefreshWrapper>
        <div>Test child content</div>
      </KeyRefreshWrapper>);
        expect(container).toMatchSnapshot();
    });
    it('renders notification UI', () => {
        const { getByText } = render(<KeyRefreshWrapper>
        <div>Test child content</div>
      </KeyRefreshWrapper>);
        expect(getByText('Loading session details...')).toBeInTheDocument();
    });
});
//# sourceMappingURL=wrapper.test.jsx.map