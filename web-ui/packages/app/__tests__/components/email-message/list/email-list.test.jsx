import React from 'react';
import { render, screen, fireEvent } from '@/__tests__/test-utils';
import { useRouter } from 'next/navigation';
import EmailList from '@/components/email-message/list';
jest.mock('@toolpad/core/useNotifications', () => ({
    useNotifications: () => ({ show: jest.fn() }),
}));
jest.mock('@/components/mui/data-grid/server-bound-data-grid', () => ({
    ServerBoundDataGrid: ({ columns, onRowDoubleClick, idColumn, getDetailPanelContent, getDetailPanelHeight, url, ...rest }) => {
        const subjectCol = columns.find((c) => c.field === 'subject');
        const subjectLink = subjectCol?.renderCell
            ? subjectCol.renderCell({ value: 'Hello world', row: { emailId: '123' } })
            : null;
        const handleDbl = () => {
            onRowDoubleClick?.({ row: { emailId: '999' } }, { isPropagationStopped: () => false }, {});
        };
        return (<div data-testid="grid" data-columns={columns.length} {...rest}>
        <button data-testid="dbl" onClick={handleDbl}>
          dbl
        </button>
        {subjectLink}
      </div>);
    },
}));
jest.mock('@/lib/site-util/url-builder', () => ({
    __esModule: true,
    default: {
        api: { email: { url: '/api/email' } },
        messages: {
            email: (id) => ({ toString: () => `/messages/email/${id}` }),
        },
    },
}));
describe('EmailList', () => {
    it('renders grid with expected columns count', () => {
        render(<EmailList />);
        expect(screen.getByTestId('grid')).toBeInTheDocument();
        expect(screen.getByTestId('grid').getAttribute('data-columns')).toBe('8');
    });
    it('renders subject column as a link with correct href', () => {
        render(<EmailList />);
        const link = screen.getByRole('link', { name: /Open email: Hello world/i });
        expect(link).toBeInTheDocument();
        expect(link).toHaveAttribute('href', expect.stringContaining('/messages/email/123'));
    });
    it('navigates on row double-click via router.push', () => {
        const useRouterMock = useRouter;
        render(<EmailList />);
        fireEvent.click(screen.getByTestId('dbl'));
        const lastRouter = useRouterMock.mock.results[useRouterMock.mock.results.length - 1].value;
        expect(lastRouter.push).toHaveBeenCalledWith(expect.objectContaining({
            toString: expect.any(Function),
        }));
        const pushArg = lastRouter.push.mock.calls[0][0];
        expect(pushArg.toString()).toBe('/messages/email/999');
    });
});
//# sourceMappingURL=email-list.test.jsx.map