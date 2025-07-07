/* eslint-disable @typescript-eslint/no-explicit-any */
import { render, screen, waitFor, act } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { createTheme } from '@mui/material/styles';
import EmailViewer from '@/components/email-message/email-viewer';
import { getEmail } from '@/lib/api/client';
import '@testing-library/jest-dom';

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
const mockFetch = jest.fn();
global.fetch = mockFetch;

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
    // jest.clearAllMocks();
    mockFetch.mockClear();
  });

  it('renders loading state initially', async () => {
    let resolvePromise: (value: any) => void;

    const promise = new Promise((resolve) => {
      resolvePromise = resolve;
    });

    // Create a mock that behaves like the real promise
    const mockPromise = {
      then: jest.fn().mockImplementation((onResolve) => {
        promise.then(onResolve);
        return mockPromise;
      }),
      catch: jest.fn().mockImplementation((onReject) => {
        promise.catch(onReject);
        return mockPromise;
      }),
      finally: jest.fn().mockImplementation((onFinally) => {
        promise.finally(onFinally);
        return mockPromise;
      }),
      cancel: jest.fn(),
    };

    mockGetEmail.mockReturnValue(mockPromise as any);

    // Mock fetch for attachments
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    });

    render(<EmailViewerWrapper emailId="test-email-id" />);

    // Check loading state
    expect(screen.getByText('Loading Email...')).toBeInTheDocument();

    // Resolve the promise after a short delay
    await act(async () => {
      resolvePromise!({
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
      });
    });

    // Wait for the component to finish loading
    await waitFor(
      () => {
        expect(screen.queryByText('Loading Email...')).not.toBeInTheDocument();
      },
      { timeout: 3000 },
    );
  });

  it('renders with valid emailId prop', async () => {
    const mockEmail = {
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
    };

    const promise = Promise.resolve(mockEmail);

    const mockPromise = {
      then: jest.fn().mockImplementation((onResolve) => {
        promise.then(onResolve);
        return mockPromise;
      }),
      catch: jest.fn().mockImplementation((onReject) => {
        promise.catch(onReject);
        return mockPromise;
      }),
      finally: jest.fn().mockImplementation((onFinally) => {
        promise.finally(onFinally);
        return mockPromise;
      }),
      cancel: jest.fn(),
    };

    mockGetEmail.mockReturnValue(mockPromise as any);

    // Mock fetch for attachments
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    });

    await act(async () => {
      render(<EmailViewerWrapper emailId="test-email-id" />);
    });

    // Wait for the email data to load and be displayed
    await waitFor(
      () => {
        expect(screen.getByText('Test Subject')).toBeInTheDocument();
      },
      { timeout: 3000 },
    );

    expect(
      screen.getByText('Test Sender (sender@test.com)'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Test Recipient (recipient@test.com)'),
    ).toBeInTheDocument();
    expect(screen.getByText('Email Details')).toBeInTheDocument();
  });

  it('handles error state gracefully', async () => {
    // Create a promise that will be rejected, but handle it to avoid unhandled rejection
    Promise.reject(new Error('Network error')).catch(() => {
      // This catch is just to prevent unhandled promise rejection in the test
      // The actual error handling happens in the mock
    });

    const mockPromise = {
      then: jest.fn().mockImplementation(() => {
        // Don't call onResolve for error case
        return mockPromise;
      }),
      catch: jest.fn().mockImplementation((onReject) => {
        // Simulate the error being caught
        setTimeout(() => onReject(new Error('Network error')), 0);
        return mockPromise;
      }),
      finally: jest.fn().mockImplementation((onFinally) => {
        // Finally should be called
        setTimeout(() => onFinally(), 10);
        return mockPromise;
      }),
      cancel: jest.fn(),
    };

    mockGetEmail.mockReturnValue(mockPromise as any);

    // Mock fetch for attachments
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    });

    await act(async () => {
      render(<EmailViewerWrapper emailId="test-email-id" />);
    });

    await waitFor(
      () => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      },
      { timeout: 3000 },
    );
  });

  it('handles empty email state', async () => {
    const promise = Promise.resolve(null);

    const mockPromise = {
      then: jest.fn().mockImplementation((onResolve) => {
        promise.then(onResolve);
        return mockPromise;
      }),
      catch: jest.fn().mockImplementation((onReject) => {
        promise.catch(onReject);
        return mockPromise;
      }),
      finally: jest.fn().mockImplementation((onFinally) => {
        promise.finally(onFinally);
        return mockPromise;
      }),
      cancel: jest.fn(),
    };

    mockGetEmail.mockReturnValue(mockPromise as any);

    // Mock fetch for attachments
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    });

    await act(async () => {
      render(<EmailViewerWrapper emailId="test-email-id" />);
    });

    await waitFor(
      () => {
        expect(screen.getByText('Email not found')).toBeInTheDocument();
      },
      { timeout: 3000 },
    );
  });

  it('handles attachments correctly', async () => {
    const mockEmail = {
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
    };

    const promise = Promise.resolve(mockEmail);

    const mockPromise = {
      then: jest.fn().mockImplementation((onResolve) => {
        promise.then(onResolve);
        return mockPromise;
      }),
      catch: jest.fn().mockImplementation((onReject) => {
        promise.catch(onReject);
        return mockPromise;
      }),
      finally: jest.fn().mockImplementation((onFinally) => {
        promise.finally(onFinally);
        return mockPromise;
      }),
      cancel: jest.fn(),
    };

    mockGetEmail.mockReturnValue(mockPromise as any);

    // Mock fetch for attachments with actual attachments
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve([
          {
            unitId: 1,
            attachmentId: 1,
            fileName: 'test-attachment.pdf',
            hrefDocument: '/api/document/1',
          },
          {
            unitId: 2,
            attachmentId: 2,
            fileName: 'another-file.doc',
            hrefDocument: '/api/document/2',
          },
        ]),
    });

    await act(async () => {
      render(<EmailViewerWrapper emailId="test-email-id" />);
    });

    // Wait for the component to load
    await waitFor(
      () => {
        expect(screen.getByText('Test Subject')).toBeInTheDocument();
      },
      { timeout: 3000 },
    );

    // Check for attachments
    await waitFor(
      () => {
        expect(screen.getByText('Attachments (2)')).toBeInTheDocument();
      },
      { timeout: 3000 },
    );

    expect(screen.getByText('test-attachment.pdf')).toBeInTheDocument();
    expect(screen.getByText('another-file.doc')).toBeInTheDocument();
  });
});
