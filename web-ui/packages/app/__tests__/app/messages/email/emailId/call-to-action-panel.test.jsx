import { render, screen, waitFor } from '@/__tests__/test-utils';
jest.mock('@/lib/api/email/properties/client');
jest.mock('next/navigation', () => ({
    useParams: () => ({ emailId: 'test-email-id' }),
}));
jest.mock('@mui/material/LinearProgress', () => {
    const MockLinearProgress = (props) => (<div data-testid="linear-progress" data-value={props.value} {...props}/>);
    return MockLinearProgress;
});
jest.mock('@mui/material/CircularProgress', () => {
    const MockCircularProgress = (props) => (<div data-testid="circular-progress" {...props}/>);
    return MockCircularProgress;
});
const mockUseQuery = jest.fn();
jest.mock('@tanstack/react-query', () => ({
    ...jest.requireActual('@tanstack/react-query'),
    useQuery: () => mockUseQuery(),
}));
import { CallToActionPanel } from '@/app/messages/email/[emailId]/call-to-action/panel';
import { getCallToActionResponse as getCallToActionResponseFromModule } from '@/lib/api/email/properties/client';
const getCallToActionResponse = getCallToActionResponseFromModule;
const mockCallToActionDetails = {
    propertyId: 'cta-test-id',
    documentId: 1,
    createdOn: new Date('2023-01-01'),
    value: 'Test call to action description',
    policy_basis: ['FERPA', 'Title IX'],
    tags: ['urgent', 'compliance'],
    categoryName: 'Call to Action',
    opened_date: new Date('2023-01-01'),
    closed_date: null,
    compliancy_close_date: new Date('2023-02-01'),
    completion_percentage: 75,
    compliance_rating: 0.85,
    inferred: false,
    compliance_date_enforceable: true,
    reasonable_request: 1,
    reasonable_reasons: ['Valid request'],
    sentiment: 0.6,
    sentiment_reasons: ['Neutral tone'],
    compliance_rating_reasons: ['Meets standards'],
    severity: 0.7,
    severity_reason: ['Moderate impact'],
    title_ix_applicable: 0.9,
    title_ix_applicable_reasons: ['Gender-based discrimination'],
    closure_actions: ['Investigation', 'Documentation'],
};
const mockResponsiveActions = [
    {
        propertyId: 'response-1',
        documentId: 1,
        createdOn: new Date('2023-01-05'),
        actionPropertyId: 'cta-test-id',
        completionPercentage: 50,
        responseTimestamp: new Date('2023-01-05'),
        value: 'Initial response to the call to action',
        policy_basis: ['FERPA'],
        tags: ['response'],
    },
];
describe('CallToActionPanel', () => {
    beforeEach(() => {
        getCallToActionResponse.mockResolvedValue({
            results: mockResponsiveActions,
            pageStats: { page: 1, num: 10, total: 1 },
        });
        mockUseQuery.mockReturnValue({
            data: mockResponsiveActions,
            isLoading: false,
            error: null,
        });
    });
    it('renders call to action details correctly', async () => {
        render(<CallToActionPanel row={mockCallToActionDetails}/>);
        await waitFor(() => {
            expect(screen.getByText('Call to Action Details (cta-test-id)')).toBeInTheDocument();
        });
        await waitFor(() => {
            expect(screen.getByText('Test call to action description')).toBeInTheDocument();
        });
        await waitFor(() => {
            expect(screen.getByText('75% Complete')).toBeInTheDocument();
        });
    });
    it('displays progress bar with correct value', async () => {
        render(<CallToActionPanel row={mockCallToActionDetails}/>);
        await waitFor(() => {
            const progressBar = screen.getByTestId('linear-progress');
            expect(progressBar).toHaveAttribute('data-value', '75');
        });
    });
    it('shows status chips correctly', async () => {
        render(<CallToActionPanel row={mockCallToActionDetails}/>);
        await waitFor(() => {
            expect(screen.getByText('Direct')).toBeInTheDocument();
            expect(screen.getByText('Enforceable')).toBeInTheDocument();
        });
    });
    it('shows rating scores', async () => {
        render(<CallToActionPanel row={mockCallToActionDetails}/>);
        await waitFor(() => {
            expect(screen.getByText('0.85')).toBeInTheDocument();
            expect(screen.getByText('0.70')).toBeInTheDocument();
            expect(screen.getByText('0.60')).toBeInTheDocument();
            expect(screen.getByText('0.90')).toBeInTheDocument();
        });
    });
    it('displays policy basis and tags in metadata', async () => {
        render(<CallToActionPanel row={mockCallToActionDetails}/>);
        await waitFor(() => {
            expect(screen.getByText('FERPA')).toBeInTheDocument();
            expect(screen.getAllByText('Title IX')).toHaveLength(2);
            expect(screen.getByText('urgent')).toBeInTheDocument();
            expect(screen.getByText('compliance')).toBeInTheDocument();
        });
    });
    it('fetches and displays related responsive actions', async () => {
        render(<CallToActionPanel row={mockCallToActionDetails}/>);
        await waitFor(() => {
            expect(screen.getByText('Related Responsive Actions (1)')).toBeInTheDocument();
        });
        await waitFor(() => {
            expect(screen.getByText('Initial response to the call to action')).toBeInTheDocument();
        });
    });
    it('shows loading state while fetching related actions', async () => {
        mockUseQuery.mockReturnValue({
            data: undefined,
            isLoading: true,
            error: null,
        });
        render(<CallToActionPanel row={mockCallToActionDetails}/>);
        await waitFor(() => {
            expect(screen.getByTestId('circular-progress')).toBeInTheDocument();
        });
    });
    it('handles API error gracefully', async () => {
        mockUseQuery.mockReturnValue({
            isLoading: false,
            error: new Error('Failed to load related responses'),
        });
        render(<CallToActionPanel row={mockCallToActionDetails}/>);
        await waitFor(() => {
            expect(screen.getByText('Failed to load related responses')).toBeInTheDocument();
        });
    });
    it('displays closure actions when available', async () => {
        render(<CallToActionPanel row={mockCallToActionDetails}/>);
        await waitFor(() => {
            expect(screen.getByText('Investigation')).toBeInTheDocument();
            expect(screen.getByText('Documentation')).toBeInTheDocument();
        });
    });
    it('displays reasoning sections when available', async () => {
        render(<CallToActionPanel row={mockCallToActionDetails}/>);
        await waitFor(() => {
            expect(screen.getByText('Reasoning and Analysis')).toBeInTheDocument();
            expect(screen.getByText('Meets standards')).toBeInTheDocument();
            expect(screen.getByText('Neutral tone')).toBeInTheDocument();
        });
    });
});
//# sourceMappingURL=call-to-action-panel.test.jsx.map