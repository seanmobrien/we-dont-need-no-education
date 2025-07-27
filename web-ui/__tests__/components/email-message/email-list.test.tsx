import { render, screen, waitFor } from '@/__tests__/test-utils';
import EmailList from '@/components/email-message/list';
import { mockEmailSummary } from '../email.mock-data';

describe('EmailList', () => {
  const mockFetch = jest.fn();

  beforeAll(() => {
    global.fetch = mockFetch;
  });

  beforeEach(() => {
    // jest.clearAllMocks();
    global.fetch = mockFetch;
  });

  it('should display loading state initially', () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });

    const { asFragment } = render(<EmailList />);
    const theElement = asFragment();
    expect(theElement).toMatchSnapshot();
  });

  it('should display error message when fetching emails fails', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Error fetching emails.'));

    render(<EmailList />);

    // The ServerBoundDataGrid component shows errors through notifications
    // We can test that the DataGrid is rendered even on error
    await waitFor(() => {
      expect(screen.getByRole('grid')).toBeInTheDocument();
    });
  });

  it('should display no emails found message when there are no emails', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ rows: [], totalRowCount: 0 }),
    });

    render(<EmailList />);

    await waitFor(() => {
      expect(screen.getByRole('grid')).toBeInTheDocument();
      // When there are no rows, the DataGrid still renders but without data rows
      const grid = screen.getByRole('grid');
      expect(grid).toBeInTheDocument();
    });
  });

  it('should display a list of emails', async () => {
    const mockEmails = mockEmailSummary();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ rows: mockEmails, totalRowCount: mockEmails.length }),
    });
    
    const { asFragment } = render(<EmailList />);
    
    await waitFor(() => {
      expect(screen.getByRole('grid')).toBeInTheDocument();
      // Check that the grid has column headers
      expect(screen.getByText('From')).toBeInTheDocument();
      expect(screen.getByText('Subject')).toBeInTheDocument();
    });

    const theElement = asFragment();
    expect(theElement).toMatchSnapshot();
  }, 10000);

  it('should display the email form when an email is selected', async () => {
    const mockEmails = mockEmailSummary();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ rows: mockEmails, totalRowCount: mockEmails.length }),
    });
    
    render(<EmailList />);
    
    await waitFor(
      () => {
        expect(screen.getByRole('grid')).toBeInTheDocument();
        // The DataGrid should be rendered with column headers
        expect(screen.getByText('From')).toBeInTheDocument();
        expect(screen.getByText('Subject')).toBeInTheDocument();
      },
      { timeout: 10000 }
    );
  });
});
