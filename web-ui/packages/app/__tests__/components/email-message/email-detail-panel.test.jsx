import React from 'react';
import { render, screen, waitFor, fireEvent, act, } from '@testing-library/react';
import '@testing-library/jest-dom';
import EmailDetailPanel from '../../../components/email-message/list/email-detail-panel';
import { getEmail } from '../../../lib/api/client';
import { getKeyPoints, getCallToAction, getCallToActionResponse, getSentimentAnalysis, getNotes, } from '../../../lib/api/email/properties/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
jest.mock('@/lib/components/mui/data-grid/query-client', () => {
    const { QueryClient } = jest.requireActual('@tanstack/react-query');
    return {
        dataGridQueryClient: new QueryClient({
            defaultOptions: {
                queries: { retry: false, staleTime: 0, gcTime: 0, cacheTime: 0 },
            },
        }),
    };
});
jest.mock('../../../lib/api/client');
jest.mock('../../../lib/api/email/properties/client');
const mockGetEmail = jest.mocked(getEmail);
const mockGetKeyPoints = jest.mocked(getKeyPoints);
const mockGetCallToAction = jest.mocked(getCallToAction);
const mockGetCallToActionResponse = jest.mocked(getCallToActionResponse);
const mockGetSentimentAnalysis = jest.mocked(getSentimentAnalysis);
const mockGetNotes = jest.mocked(getNotes);
const createTestQueryClient = () => {
    return new QueryClient({
        defaultOptions: {
            queries: {
                retry: false,
                gcTime: 0,
            },
        },
    });
};
const TestWrapper = ({ children }) => {
    const queryClient = createTestQueryClient();
    return (<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>);
};
const TIMEOUT = 30000;
const mockEmailSummary = {
    emailId: 'test-email-123',
    sender: {
        contactId: 1,
        name: 'Test Sender',
        email: 'sender@test.com',
    },
    subject: 'Test Email Subject',
    sentOn: new Date('2023-01-01T10:00:00Z'),
    recipients: [],
    count_attachments: 0,
    count_kpi: 2,
    count_notes: 1,
    count_cta: 3,
    count_responsive_actions: 1,
};
const mockFullEmail = {
    emailId: 'test-email-123',
    sender: { contactId: '1', name: 'Test Sender', email: 'sender@test.com' },
    recipients: [
        { contactId: '2', name: 'Test Recipient', email: 'recipient@test.com' },
    ],
    subject: 'Test Email Subject',
    sentOn: new Date('2023-01-01T10:00:00Z'),
    body: 'This is the full email body content with detailed information.',
    threadId: 1,
    parentEmailId: null,
};
const mockNotes = [
    {
        propertyId: 'note-1',
        documentId: 1,
        createdOn: new Date('2023-01-01'),
        value: 'This is an important note about the email',
        policy_basis: ['FERPA'],
        tags: ['important'],
    },
    {
        propertyId: 'note-2',
        documentId: 1,
        createdOn: new Date('2023-01-02'),
        value: 'Another note with additional context',
        policy_basis: ['Title IX'],
        tags: ['context'],
    },
];
const mockKeyPoints = [
    {
        propertyId: 'kp-1',
        documentId: 1,
        createdOn: new Date('2023-01-01'),
        value: 'Key point about compliance requirements',
        relevance: null,
        compliance: null,
        severity: null,
        inferred: false,
    },
];
describe('EmailDetailPanel', () => {
    beforeEach(() => {
        mockGetEmail.mockResolvedValue(mockFullEmail);
        mockGetKeyPoints.mockResolvedValue({
            pageStats: { total: 0, page: 1, num: 10 },
            results: [],
        });
        mockGetCallToAction.mockResolvedValue({
            pageStats: { total: 0, page: 1, num: 10 },
            results: [],
        });
        mockGetCallToActionResponse.mockResolvedValue({
            pageStats: { total: 0, page: 1, num: 10 },
            results: [],
        });
        mockGetSentimentAnalysis.mockResolvedValue({
            pageStats: { total: 0, page: 1, num: 10 },
            results: [],
        });
        mockGetNotes.mockResolvedValue({
            pageStats: { total: 0, page: 1, num: 10 },
            results: [],
        });
    });
    it('renders without crashing and shows loading state initially', () => {
        render(<EmailDetailPanel row={mockEmailSummary}/>, {
            wrapper: TestWrapper,
        });
        expect(screen.getByText('Loading Email Details...')).toBeInTheDocument();
    }, TIMEOUT);
    it('shows email summary when no full email data is loaded', async () => {
        const summaryOnly = {
            ...mockEmailSummary,
            emailId: '',
        };
        render(<EmailDetailPanel row={summaryOnly}/>, { wrapper: TestWrapper });
        expect(screen.queryByText('Loading Email Details...')).not.toBeInTheDocument();
        expect(screen.getByText('Email Summary')).toBeInTheDocument();
        expect(screen.getByText('Test Email Subject')).toBeInTheDocument();
        expect(screen.getByText(/Test Sender/)).toBeInTheDocument();
    }, TIMEOUT);
    it('shows fully loaded email details when email data is successfully loaded', async () => {
        await act(async () => {
            render(<EmailDetailPanel row={mockEmailSummary}/>, {
                wrapper: TestWrapper,
            });
        });
        await waitFor(() => {
            expect(screen.queryByText('Loading Email Details...')).not.toBeInTheDocument();
        }, { timeout: 3000 });
        await waitFor(() => {
            expect(screen.getByText('Email Details')).toBeInTheDocument();
        }, { timeout: 3000 });
        expect(screen.getByText('Test Email Subject')).toBeInTheDocument();
        expect(screen.getByText('Test Sender (sender@test.com)')).toBeInTheDocument();
        expect(screen.getByText('Test Recipient (recipient@test.com)')).toBeInTheDocument();
        expect(screen.getByText('This is the full email body content with detailed information.')).toBeInTheDocument();
        expect(screen.getByText('Email Content')).toBeInTheDocument();
    }, TIMEOUT);
    it('handles expandable notes panel with proper loading and data display', async () => {
        const summaryOnly = {
            ...mockEmailSummary,
            emailId: 'test-email-123',
        };
        mockGetEmail.mockResolvedValue(null);
        mockGetNotes.mockResolvedValue({
            pageStats: { total: 0, page: 1, num: 10 },
            results: mockNotes,
        });
        render(<EmailDetailPanel row={summaryOnly}/>, { wrapper: TestWrapper });
        await waitFor(() => {
            expect(screen.queryByText('Loading Email Details...')).not.toBeInTheDocument();
        });
        const notesAccordion = screen.getByRole('button', {
            name: /Notes \(1\)/,
        });
        expect(notesAccordion).toBeInTheDocument();
        await act(async () => {
            fireEvent.click(notesAccordion);
        });
        expect(mockGetNotes).toHaveBeenCalledWith({
            emailId: 'test-email-123',
            page: 1,
            num: 100,
        });
        await waitFor(() => {
            expect(screen.getByText('This is an important note about the email')).toBeInTheDocument();
            expect(screen.getByText('Another note with additional context')).toBeInTheDocument();
        });
    }, TIMEOUT);
    it('handles expandable key points panel with proper loading', async () => {
        const summaryOnly = {
            ...mockEmailSummary,
            emailId: 'test-email-123',
        };
        mockGetEmail.mockResolvedValue(null);
        mockGetKeyPoints.mockResolvedValue({
            pageStats: { total: 0, page: 1, num: 10 },
            results: mockKeyPoints,
        });
        render(<EmailDetailPanel row={summaryOnly}/>, { wrapper: TestWrapper });
        await waitFor(() => {
            expect(screen.queryByText('Loading Email Details...')).not.toBeInTheDocument();
        });
        const keyPointsAccordion = screen.getByRole('button', {
            name: /Key Points \(2\)/,
        });
        expect(keyPointsAccordion).toBeInTheDocument();
        await act(async () => {
            fireEvent.click(keyPointsAccordion);
        });
        expect(mockGetKeyPoints).toHaveBeenCalledWith({
            emailId: 'test-email-123',
            page: 1,
            num: 100,
        });
        await waitFor(() => {
            expect(screen.getByText('Key point about compliance requirements')).toBeInTheDocument();
        });
    }, TIMEOUT);
    it('shows loading state in accordion when properties are being fetched', async () => {
        const summaryOnly = {
            ...mockEmailSummary,
            emailId: 'test-email-123',
        };
        mockGetEmail.mockResolvedValue(null);
        let resolveNotes;
        const slowNotesPromise = new Promise((resolve) => {
            resolveNotes = resolve;
        });
        mockGetNotes.mockReturnValue(slowNotesPromise);
        render(<EmailDetailPanel row={summaryOnly}/>, { wrapper: TestWrapper });
        await waitFor(() => {
            expect(screen.queryByText('Loading Email Details...')).not.toBeInTheDocument();
        }, { timeout: 3000 });
        const notesAccordion = screen.getByRole('button', {
            name: /Notes \(1\)/,
        });
        await act(async () => {
            fireEvent.click(notesAccordion);
        });
        try {
            screen.getByRole('progressbar');
        }
        catch (e) {
        }
        await act(async () => {
            resolveNotes({ results: mockNotes });
        });
        await waitFor(() => {
            expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
            expect(screen.getByText('This is an important note about the email')).toBeInTheDocument();
        }, { timeout: 3000 });
    }, TIMEOUT);
    it('shows correct count badges in summary view', async () => {
        const summaryOnly = {
            ...mockEmailSummary,
            emailId: '',
        };
        render(<EmailDetailPanel row={summaryOnly}/>, { wrapper: TestWrapper });
        expect(screen.queryByText('Loading Email Details...')).not.toBeInTheDocument();
        expect(screen.getByText('Email Summary')).toBeInTheDocument();
        expect(screen.getByText('2 Key Points')).toBeInTheDocument();
        expect(screen.getByText('1 Notes')).toBeInTheDocument();
        expect(screen.getByText('4 CTAs')).toBeInTheDocument();
    }, TIMEOUT);
});
//# sourceMappingURL=email-detail-panel.test.jsx.map