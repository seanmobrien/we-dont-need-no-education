/* eslint-disable @typescript-eslint/no-explicit-any */
import { render, screen, waitFor, act } from '@/__tests__/test-utils';
import EmailViewer from '@/components/email-message/email-viewer';
import { fetch } from '@/lib/nextjs-util/fetch';

// Mock Promise.withResolvers if not available
if (!Promise.withResolvers) {
  Promise.withResolvers = function<T>() {
    let resolve: (value: T | PromiseLike<T>) => void;
    let reject: (reason?: any) => void;
    const promise = new Promise<T>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve: resolve!, reject: reject! };
  };
}

describe('EmailViewer', () => {
  let consoleErrorSpy: jest.SpyInstance<void, [message?: any, ...optionalParams: any[]], any> | undefined;
  beforeEach(() => {
    // Clear fetch mock - it's already mocked globally in jest.setup.ts
    (fetch as jest.Mock).mockClear();
  });
  afterEach(() => {
    consoleErrorSpy?.mockRestore();
    consoleErrorSpy = undefined;
  });

  it('renders loading state initially', async () => {
    const request = Promise.withResolvers();
    const resolvePromise = request.resolve;
    const promise = request.promise;
        
    // Mock fetch to return a delayed promise
    (fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/api/email/test-email-id/attachments')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        });
      }
      if (url.includes('/api/email/test-email-id')) {
        return promise.then((value) => ({
          ok: true,
          json: () => Promise.resolve(value),
        }));
      }
      return Promise.reject(new Error('Unexpected URL'));
    });
    
    render(<EmailViewer emailId="test-email-id" />);

    // Check loading state
    expect(screen.getByText('Loading Email...')).toBeInTheDocument();
    
    // Resolve the promise
    act(() => {
      resolvePromise({
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
      { timeout: 5000 },
    );
  }, 10000);

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

    // Mock fetch for both email and attachments
    (fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/api/email/test-email-id/attachments')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        });
      }
      if (url.includes('/api/email/test-email-id')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockEmail),
        });
      }
      return Promise.reject(new Error('Unexpected URL'));
    });

    render(<EmailViewer emailId="test-email-id" />);

    // Wait for the email data to load and be displayed
    await waitFor(
      () => {
        expect(screen.getByText('Test Subject')).toBeInTheDocument();
      },
      { timeout: 5000 },
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
    // Turn off console.error logging for this planned exception - keeps test output clean.
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    // Mock fetch to throw an error
    (fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/api/email/test-email-id/attachments')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        });
      }
      if (url.includes('/api/email/test-email-id')) {
        return Promise.reject(new Error('Network error'));
      }
      return Promise.reject(new Error('Unexpected URL'));
    });

    render(<EmailViewer emailId="test-email-id" />);

    // Wait for error boundary to catch the error and render fallback
    await waitFor(
      () => {
        // The error boundary should render some error UI
        expect(screen.getByRole('alert')).toBeInTheDocument();
      },
      { timeout: 5000 },
    );
  }, 10000);

  it('handles empty email state', async () => {
    // Turn off console.error logging for this planned exception - keeps test output clean.
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    // Mock fetch to return 404 for email
    (fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/api/email/test-email-id/attachments')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        });
      }
      if (url.includes('/api/email/test-email-id')) {
        return Promise.reject(new Error('Email not found'));
      }
      return Promise.reject(new Error('Unexpected URL'));
    });

    render(<EmailViewer emailId="test-email-id" />);

    await waitFor(
      () => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      },
      { timeout: 5000 },
    );
  }, 10000);

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

    // Mock fetch for both email and attachments
    (fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/api/email/test-email-id/attachments')) {
        return Promise.resolve({
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
      }
      if (url.includes('/api/email/test-email-id')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockEmail),
        });
      }
      return Promise.reject(new Error('Unexpected URL'));
    });

    render(<EmailViewer emailId="test-email-id" />);

    // Wait for the component to load
    await waitFor(
      () => {
        expect(screen.getByText('Test Subject')).toBeInTheDocument();
      },
      { timeout: 5000 },
    );

    // Check for attachments
    await waitFor(
      () => {
        expect(screen.getByText('Attachments (2)')).toBeInTheDocument();
      },
      { timeout: 5000 },
    );

    expect(screen.getByText('test-attachment.pdf')).toBeInTheDocument();
    expect(screen.getByText('another-file.doc')).toBeInTheDocument();
  });
});

