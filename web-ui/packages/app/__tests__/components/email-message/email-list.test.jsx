import { render, screen, waitFor, jsonResponse, asyncRender, } from '@/__tests__/test-utils';
import EmailList from '@/components/email-message/list';
import { mockEmailSummary } from '../email.mock-data';
import { fetch } from '@/lib/nextjs-util/fetch';
const TIMEOUT = 30000;
jest.mock('next/navigation', () => ({
    useRouter: () => ({
        push: jest.fn(),
        back: jest.fn(),
        forward: jest.fn(),
        refresh: jest.fn(),
        replace: jest.fn(),
        prefetch: jest.fn(),
    }),
}));
describe('EmailList', () => {
    let consoleErrorSpy;
    beforeEach(() => {
        consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
    });
    afterEach(() => {
        consoleErrorSpy?.mockRestore();
        consoleErrorSpy = undefined;
    });
    it('should mount and render grid initially', () => {
        fetch.mockResolvedValueOnce(jsonResponse({ rows: [], totalRowCount: 0 }));
        render(<EmailList />);
        expect(screen.getByRole('grid')).toBeInTheDocument();
    }, TIMEOUT);
    it('should display error message when fetching emails fails', async () => {
        fetch.mockRejectedValueOnce(new Error('Error fetching emails.'));
        await asyncRender(<EmailList />);
        await waitFor(() => {
            expect(screen.getByRole('grid')).toBeInTheDocument();
        });
    }, TIMEOUT);
    it('should display no emails found message when there are no emails', async () => {
        fetch.mockResolvedValueOnce(jsonResponse({ rows: [], totalRowCount: 0 }));
        await asyncRender(<EmailList />);
        await waitFor(() => {
            expect(screen.getByRole('grid')).toBeInTheDocument();
            const grid = screen.getByRole('grid');
            expect(grid).toBeInTheDocument();
        });
    }, TIMEOUT);
    it('should display a list of emails', async () => {
        const mockEmails = mockEmailSummary();
        fetch.mockResolvedValueOnce(jsonResponse({ rows: mockEmails, totalRowCount: mockEmails.length }));
        await asyncRender(<EmailList />);
        await waitFor(() => {
            expect(screen.getByRole('grid')).toBeInTheDocument();
            expect(screen.getByText('From')).toBeInTheDocument();
            expect(screen.getByText('Subject')).toBeInTheDocument();
        });
    }, TIMEOUT);
    it('should display the email form when an email is selected', async () => {
        const mockEmails = mockEmailSummary();
        fetch.mockResolvedValueOnce(jsonResponse({ rows: mockEmails, totalRowCount: mockEmails.length }));
        await asyncRender(<EmailList />);
        await waitFor(() => {
            expect(screen.getByRole('grid')).toBeInTheDocument();
            expect(screen.getByText('From')).toBeInTheDocument();
            expect(screen.getByText('Subject')).toBeInTheDocument();
        });
    }, TIMEOUT);
});
//# sourceMappingURL=email-list.test.jsx.map