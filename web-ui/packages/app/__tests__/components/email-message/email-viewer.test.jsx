import { render, screen, waitFor, act, hideConsoleOutput, } from '@/__tests__/test-utils';
import EmailViewer from '@/components/email-message/email-viewer';
import { fetch } from '@/lib/nextjs-util/fetch';
const TIMEOUT = 30000;
if (!Promise.withResolvers) {
    Promise.withResolvers = function () {
        let resolve;
        let reject;
        const promise = new Promise((res, rej) => {
            resolve = res;
            reject = rej;
        });
        return { promise, resolve: resolve, reject: reject };
    };
}
describe('EmailViewer', () => {
    const consoleErrors = hideConsoleOutput();
    beforeEach(() => {
        fetch.mockClear();
    });
    afterEach(() => {
        consoleErrors.dispose();
    });
    it('renders loading state initially', async () => {
        const request = Promise.withResolvers();
        const resolvePromise = request.resolve;
        const promise = request.promise;
        fetch.mockImplementation((url) => {
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
        render(<EmailViewer emailId="test-email-id"/>);
        expect(screen.getByText('Loading Email...')).toBeInTheDocument();
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
        await waitFor(() => {
            expect(screen.queryByText('Loading Email...')).not.toBeInTheDocument();
        }, { timeout: 5000 });
    }, TIMEOUT);
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
        fetch.mockImplementation((url) => {
            if (url.includes('/api/email/test-email-id/attachments')) {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve([]),
                });
            }
            return Promise.resolve({
                ok: true,
                json: () => Promise.resolve(mockEmail),
            });
        });
        render(<EmailViewer emailId="test-email-id"/>);
        await waitFor(async () => await expect(screen.getByText('Test Subject')).toBeInTheDocument());
        expect(screen.getByText('Test Sender (sender@test.com)')).toBeInTheDocument();
        expect(screen.getByText('Test Recipient (recipient@test.com)')).toBeInTheDocument();
        expect(screen.getByText('Email Details')).toBeInTheDocument();
    }, TIMEOUT);
    it('handles error state gracefully', async () => {
        consoleErrors.setup();
        fetch.mockImplementation((url) => {
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
        render(<EmailViewer emailId="test-email-id"/>);
        await waitFor(() => {
            expect(screen.getByRole('alert')).toBeInTheDocument();
        }, { timeout: 5000 });
    }, TIMEOUT);
    it('handles empty email state', async () => {
        consoleErrors.setup();
        fetch.mockImplementation((url) => {
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
        render(<EmailViewer emailId="test-email-id"/>);
        await waitFor(() => {
            expect(screen.getByRole('alert')).toBeInTheDocument();
        }, { timeout: 5000 });
    }, TIMEOUT);
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
        fetch.mockImplementation((url) => {
            if (url.includes('/api/email/test-email-id/attachments')) {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve([
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
        render(<EmailViewer emailId="test-email-id"/>);
        await waitFor(() => {
            expect(screen.getByText('Test Subject')).toBeInTheDocument();
        }, { timeout: 5000 });
        await waitFor(() => {
            expect(screen.getByText('Attachments (2)')).toBeInTheDocument();
        }, { timeout: 5000 });
        expect(screen.getByText('test-attachment.pdf')).toBeInTheDocument();
        expect(screen.getByText('another-file.doc')).toBeInTheDocument();
    }, TIMEOUT);
});
//# sourceMappingURL=email-viewer.test.jsx.map