/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react/display-name */
import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CallToActionPanel } from '@/app/messages/email/[emailId]/call-to-action/panel';
import { CallToActionDetails } from '@/data-models/api';
import * as client from '@/lib/api/email/properties/client';

// Mock the API client
jest.mock('@/lib/api/email/properties/client');
const mockedClient = client as jest.Mocked<typeof client>;

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useParams: () => ({ emailId: 'test-email-id' }),
}));

// Mock MUI components that may cause theme issues
jest.mock(
  '@mui/material/LinearProgress',
  () =>
    ({ value, ...props }: { value?: number }) => (
      <div data-testid="linear-progress" data-value={value} {...props} />
    ),
);

jest.mock('@mui/material/CircularProgress', () => () => (
  <div data-testid="circular-progress" />
));

const mockCallToActionDetails: CallToActionDetails = {
  propertyId: 'cta-test-id',
  documentId: 1,
  createdOn: new Date('2023-01-01'),
  value: 'Test call to action description',
  policy_basis: ['FERPA', 'Title IX'],
  tags: ['urgent', 'compliance'],
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
    jest.clearAllMocks();
    mockedClient.getCallToActionResponse.mockResolvedValue({
      results: mockResponsiveActions,
      pageStats: { page: 1, num: 10, total: 1 },
    });
  });

  it('renders call to action details correctly', async () => {
    await act(async () => {
      render(<CallToActionPanel row={mockCallToActionDetails} />);
    });

    // Wait for async operations to complete
    await waitFor(() => {
      expect(screen.getByText('Call to Action Details')).toBeInTheDocument();
    });

    expect(
      screen.getByText('Test call to action description'),
    ).toBeInTheDocument();
    expect(screen.getByText('75% Complete')).toBeInTheDocument();
  });

  it('displays progress bar with correct value', async () => {
    await act(async () => {
      render(<CallToActionPanel row={mockCallToActionDetails} />);
    });

    await waitFor(() => {
      const progressBar = screen.getByTestId('linear-progress');
      expect(progressBar).toHaveAttribute('data-value', '75');
    });
  });

  it('shows status chips correctly', async () => {
    await act(async () => {
      render(<CallToActionPanel row={mockCallToActionDetails} />);
    });

    await waitFor(() => {
      expect(screen.getByText('Direct')).toBeInTheDocument(); // since inferred is false
      expect(screen.getByText('Enforceable')).toBeInTheDocument(); // since compliance_date_enforceable is true
    });
  });

  it('shows rating scores', async () => {
    await act(async () => {
      render(<CallToActionPanel row={mockCallToActionDetails} />);
    });

    await waitFor(() => {
      expect(screen.getByText('0.85')).toBeInTheDocument(); // compliance_rating
      expect(screen.getByText('0.70')).toBeInTheDocument(); // severity
      expect(screen.getByText('0.60')).toBeInTheDocument(); // sentiment
      expect(screen.getByText('0.90')).toBeInTheDocument(); // title_ix_applicable
    });
  });

  it('displays policy basis and tags in metadata', async () => {
    await act(async () => {
      render(<CallToActionPanel row={mockCallToActionDetails} />);
    });

    await waitFor(() => {
      expect(screen.getByText('FERPA')).toBeInTheDocument();
      expect(screen.getAllByText('Title IX')).toHaveLength(2); // Once in scores, once in policy basis
      expect(screen.getByText('urgent')).toBeInTheDocument();
      expect(screen.getByText('compliance')).toBeInTheDocument();
    });
  });

  it('fetches and displays related responsive actions', async () => {
    await act(async () => {
      render(<CallToActionPanel row={mockCallToActionDetails} />);
    });

    await waitFor(() => {
      expect(mockedClient.getCallToActionResponse).toHaveBeenCalledWith({
        emailId: 'test-email-id',
        page: 1,
        num: 100,
      });
    });

    await waitFor(() => {
      expect(
        screen.getByText('Related Responsive Actions (1)'),
      ).toBeInTheDocument();
    });
  });

  it('shows loading state while fetching related actions', async () => {
    // Make the API call take some time
    mockedClient.getCallToActionResponse.mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                results: mockResponsiveActions,
                pagination: { page: 1, num: 10, total: 1 },
              }),
            100,
          ),
        ) as any,
    );

    await act(async () => {
      render(<CallToActionPanel row={mockCallToActionDetails} />);
    });

    expect(screen.getByTestId('circular-progress')).toBeInTheDocument();

    // Wait for loading to complete
    await waitFor(
      () => {
        expect(
          screen.queryByTestId('circular-progress'),
        ).not.toBeInTheDocument();
      },
      { timeout: 200 },
    );
  });

  it('handles API error gracefully', async () => {
    mockedClient.getCallToActionResponse.mockRejectedValue(
      new Error('API Error'),
    );

    await act(async () => {
      render(<CallToActionPanel row={mockCallToActionDetails} />);
    });

    await waitFor(() => {
      expect(
        screen.getByText('Failed to load related responses'),
      ).toBeInTheDocument();
    });
  });

  it('displays closure actions when available', async () => {
    await act(async () => {
      render(<CallToActionPanel row={mockCallToActionDetails} />);
    });

    await waitFor(() => {
      expect(screen.getByText('Investigation')).toBeInTheDocument();
      expect(screen.getByText('Documentation')).toBeInTheDocument();
    });
  });

  it('displays reasoning sections when available', async () => {
    await act(async () => {
      render(<CallToActionPanel row={mockCallToActionDetails} />);
    });

    await waitFor(() => {
      expect(screen.getByText('Reasoning and Analysis')).toBeInTheDocument();
      expect(screen.getByText('Meets standards')).toBeInTheDocument();
      expect(screen.getByText('Neutral tone')).toBeInTheDocument();
    });
  });
});
