import { render, screen, waitFor } from '@testing-library/react';
import EmailList from 'components/email-message/email-list';
import { mockEmail, mockEmailSummary } from '../email.mock-data';

const testIds = {
  noneFound: 'email-list-none-found',
  error: 'email-list-error',
  sender: (emailId: number) => `email-list-sender-${emailId}`,
  subject: (emailId: number) => `email-list-subject-${emailId}`,
  timestamp: (emailId: number) => `email-list-timestamp-${emailId}`,
  editHeader: 'email-list-edit-header',
};

describe('EmailList', () => {
  const mockFetch = jest.fn();

  beforeAll(() => {
    global.fetch = mockFetch;
  });

  beforeEach(() => {
    jest.clearAllMocks();
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

    await waitFor(() => {
      const error = expect(screen.getByTestId(testIds.error));
      error.toBeInTheDocument();
      error.toHaveTextContent('Error fetching emails.');
    });
  });

  it('should display no emails found message when there are no emails', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });

    render(<EmailList />);

    await waitFor(() => {
      expect(screen.getByTestId(testIds.noneFound)).toBeInTheDocument();
    });
  });

  it('should display a list of emails', async () => {
    const mockEmails = mockEmailSummary();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockEmails,
    });
    const { asFragment } = render(<EmailList />);
    await waitFor(() => {
      expect(screen.getByTestId(testIds.sender(1))).toBeInTheDocument();
      expect(screen.getByTestId(testIds.subject(1))).toBeInTheDocument();
      expect(screen.getByTestId(testIds.sender(2))).toBeInTheDocument();
      expect(screen.getByTestId(testIds.subject(2))).toBeInTheDocument();
    });

    const theElement = asFragment();
    expect(theElement).toMatchSnapshot();
  }, 5000);

  it('should display the email form when an email is selected', async () => {
    const mockEmails = mockEmailSummary();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockEmails,
    });
    render(<EmailList />);
    await waitFor(
      () => {
        const subjectNode = screen.getByTestId(testIds.subject(1));
        expect(subjectNode).toBeInTheDocument();

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockEmail(),
        });
        subjectNode.click();
        expect(screen.getByTestId(testIds.editHeader)).toBeInTheDocument();
      },
      { timeout: 10000 }
    );
  });
});
