import React from 'react';
import { render, screen, waitFor } from '@/__tests__/test-utils';
import { CustomEmailPageItem } from '@/components/email-message/dashboard-layout/custom-email-page-item';
import siteBuilder from '@/lib/site-util/url-builder';
const makeItem = (overrides = {}) => ({
    kind: 'page',
    title: 'Email',
    segment: 'email/{emailId}',
    children: [
        { kind: 'page', title: 'Details', segment: 'details' },
        { kind: 'page', title: undefined, segment: 'attachments' },
    ],
    ...overrides,
});
jest.mock('@/lib/site-util/url-builder', () => ({
    __esModule: true,
    default: {
        messages: {
            email: (emailId) => ({
                toString: () => `/messages/email/${emailId}`,
            }),
        },
    },
}));
jest.mock('@toolpad/core/DashboardLayout', () => ({
    DashboardSidebarPageItem: ({ item }) => (<div data-testid={`sidebar-item-${item.segment || item.title}`}>
      {item.title}
    </div>),
}));
describe('CustomEmailPageItem', () => {
    it('marks parent as current page when pathname matches', async () => {
        const { container } = render(<CustomEmailPageItem item={makeItem()} mini={false} emailId="123" pathname={'/messages/email/123'}/>);
        await waitFor(() => expect(screen.getByRole('link', { name: 'Email' })).toHaveAttribute('aria-current', 'page'));
        expect(container).toMatchSnapshot();
        const link = screen.getByRole('link', { name: 'Email' });
        expect(link).toHaveAttribute('aria-current', 'page');
    }, 5000);
    it('should link to chat history page when item is Chat History, not to email', async () => {
        const chatItem = {
            kind: 'page',
            title: 'Chat History',
            segment: 'messages/chat',
            children: [],
        };
        const { container } = render(<CustomEmailPageItem item={chatItem} mini={false} emailId="test-email-123" pathname={'/messages/chat'}/>);
        await waitFor(() => expect(screen.getByRole('link', { name: 'Chat History' })).toHaveAttribute('href', '/messages/chat'));
        const link = screen.getByRole('link', { name: 'Chat History' });
        expect(link).toHaveAttribute('href', '/messages/chat');
        expect(container).toMatchSnapshot();
    });
    it('should link to email page when item is View Email', async () => {
        const emailItem = {
            kind: 'page',
            title: 'View Email',
            segment: 'messages/email/123',
            children: [],
        };
        render(<CustomEmailPageItem item={emailItem} mini={false} emailId="test-email-123" pathname={siteBuilder.messages.email('test-email-123')}/>);
        await waitFor(() => expect(screen.getByRole('button', { name: 'View Email' }).querySelector('a')).toHaveAttribute('href', '/messages/email/test-email-123'));
        const link = screen
            .getByRole('button', { name: 'View Email' })
            .querySelector('a');
        expect(link).toHaveAttribute('href');
    });
    it('applies active style to child when last segment matches', async () => {
        render(<CustomEmailPageItem item={makeItem()} mini={false} emailId="123" pathname={siteBuilder.messages.email('123/details').toString()}/>);
        await waitFor(() => {
            const active = document.querySelector('[data-active="true"]');
            expect(active).toBeTruthy();
        });
        const active = document.querySelector('[data-active="true"]');
        expect(active).toBeTruthy();
        expect(active?.textContent).toMatch(/details|Details/i);
    });
    it('renders tooltip and aria-label in mini mode', async () => {
        render(<CustomEmailPageItem item={makeItem({ icon: (<span data-testid="icon">I</span>) })} mini={true} emailId="123" pathname={siteBuilder.messages.email('123').toString()}/>);
        await waitFor(() => expect(screen.getByRole('button', { name: /email/i })).toBeInTheDocument());
        const button = screen.getByRole('button', { name: /email/i });
        expect(button).toBeInTheDocument();
    });
    it('labels child list with item title', async () => {
        render(<CustomEmailPageItem item={makeItem()} mini={false} emailId="123" pathname={siteBuilder.messages.email('123').toString()}/>);
        await waitFor(() => expect(screen.getByRole('list', { name: /email sections/i })).toBeInTheDocument());
        const list = screen.getByRole('list', { name: /email sections/i });
        expect(list).toBeInTheDocument();
    });
});
//# sourceMappingURL=custom-email-page-item.test.jsx.map