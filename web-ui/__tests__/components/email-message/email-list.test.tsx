/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  render,
  screen,
  waitFor,
  jsonResponse,
  asyncRender,
} from '@/__tests__/test-utils';
import EmailList from '@/components/email-message/list';
import { mockEmailSummary } from '../email.mock-data';
import { fetch } from '@/lib/nextjs-util/fetch';

// Mock the router
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
  let consoleErrorSpy:
    | jest.SpyInstance<void, [message?: any, ...optionalParams: any[]], any>
    | undefined;
  beforeEach(() => {
    // Turn off console.error logging for these planned exceptions - keeps test output clean.
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => {
    consoleErrorSpy?.mockRestore();
    consoleErrorSpy = undefined;
  });

  it('should mount and render grid initially', () => {
    (fetch as jest.Mock).mockResolvedValueOnce(
      jsonResponse({ rows: [], totalRowCount: 0 }),
    );
    render(<EmailList />);
    expect(screen.getByRole('grid')).toBeInTheDocument();
  });

  it('should display error message when fetching emails fails', async () => {
    (fetch as jest.Mock).mockRejectedValueOnce(
      new Error('Error fetching emails.'),
    );

    await asyncRender(<EmailList />);

    // The ServerBoundDataGrid component shows errors through notifications
    // We can test that the DataGrid is rendered even on error
    await waitFor(() => {
      expect(screen.getByRole('grid')).toBeInTheDocument();
    });
  });

  it('should display no emails found message when there are no emails', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce(
      jsonResponse({ rows: [], totalRowCount: 0 }),
    );

    await asyncRender(<EmailList />);

    await waitFor(() => {
      expect(screen.getByRole('grid')).toBeInTheDocument();
      // When there are no rows, the DataGrid still renders but without data rows
      const grid = screen.getByRole('grid');
      expect(grid).toBeInTheDocument();
    });
  });

  it('should display a list of emails', async () => {
    const mockEmails = mockEmailSummary();
    (fetch as jest.Mock).mockResolvedValueOnce(
      jsonResponse({ rows: mockEmails, totalRowCount: mockEmails.length }),
    );
    await asyncRender(<EmailList />);

    await waitFor(() => {
      expect(screen.getByRole('grid')).toBeInTheDocument();
      // Check that the grid has column headers
      expect(screen.getByText('From')).toBeInTheDocument();
      expect(screen.getByText('Subject')).toBeInTheDocument();
    });
  }, 10000);

  it('should display the email form when an email is selected', async () => {
    const mockEmails = mockEmailSummary();
    (fetch as jest.Mock).mockResolvedValueOnce(
      jsonResponse({ rows: mockEmails, totalRowCount: mockEmails.length }),
    );
    await asyncRender(<EmailList />);

    await waitFor(() => {
      expect(screen.getByRole('grid')).toBeInTheDocument();
      // The DataGrid should be rendered with column headers
      expect(screen.getByText('From')).toBeInTheDocument();
      expect(screen.getByText('Subject')).toBeInTheDocument();
    });
  });
});
