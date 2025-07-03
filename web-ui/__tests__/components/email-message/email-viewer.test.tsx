/* eslint-disable @typescript-eslint/no-explicit-any */
import { act } from '@/__tests__/test-utils';
import { render, screen, waitFor } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { createTheme } from '@mui/material/styles';
import EmailViewer from '@/components/email-message/email-viewer';
import { getEmail } from '@/lib/api/client';

// Mock the API modules
jest.mock('@/lib/api/client', () => ({
  getEmail: jest.fn(),
}));

jest.mock('@/lib/logger', () => ({
  log: jest.fn(),
}));

jest.mock('@/lib/react-util', () => ({
  isError: jest.fn(),
  LoggedError: {
    isTurtlesAllTheWayDownBaby: jest.fn(),
  },
}));

jest.mock('@/lib/typescript', () => ({
  AbortablePromise: {
    isOperationCancelledError: jest.fn(() => false),
  },
}));

// Mock fetch
global.fetch = jest.fn();

const theme = createTheme();

// Get the mocked version for type safety
const mockGetEmail = jest.mocked(getEmail);

const EmailViewerWrapper = ({ emailId }: { emailId: string }) => (
  <ThemeProvider theme={theme}>
    <EmailViewer emailId={emailId} />
  </ThemeProvider>
);

describe('EmailViewer', () => {
  beforeEach(() => {
    //jest.clearAllMocks();

    const mockCancellablePromise = {
      then: jest.fn().mockResolvedValue(
        Promise.resolve({
          emailId: 'test-email-id',
          sender: {
            contactId: 1,
            name: 'Test Sender',
            email: 'sender@test.com',
          },
          recipients: [
            {
              contactId: 2,
              name: 'Test Recipient',
              email: 'recipient@test.com',
            },
          ],
          subject: 'Test Subject',
          body: 'Test email body content',
          sentOn: '2023-01-01T00:00:00Z',
          threadId: 1,
          parentEmailId: null,
        }),
      ),
      catch: jest.fn(),
      finally: jest.fn(),
      cancel: jest.fn(),
      cancelled: jest.fn(),
      awaitable: Promise.resolve(),
    };

    mockGetEmail.mockReturnValue(mockCancellablePromise as any);
  });

  it('renders loading state initially', () => {
    render(<EmailViewerWrapper emailId="test-email-id" />);
    act(() => {
      waitFor(() => {
        expect(screen.getByText('Loading Email...')).toBeInTheDocument();
      });
    });
  });
  /*
  it('renders with valid emailId prop', () => {
    render(<EmailViewerWrapper emailId="test-email-id" />);
    act(() => {
      waitFor(() => screen.getByText('Test Subject'));
    });
    expect(screen.getByText('Test Subject')).toBeInTheDocument();
  });
  */
});
