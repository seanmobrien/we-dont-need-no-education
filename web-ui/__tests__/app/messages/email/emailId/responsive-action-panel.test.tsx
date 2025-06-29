/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ResponsiveActionPanel } from '@/app/messages/email/[emailId]/call-to-action-response/panel';
import { CallToActionResponseDetails } from '@/data-models/api';
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

const mockResponseDetails: CallToActionResponseDetails = {
  propertyId: 'response-test-id',
  documentId: 1,
  createdOn: new Date('2023-01-05'),
  actionPropertyId: 'cta-test-id',
  completionPercentage: 80,
  responseTimestamp: new Date('2023-01-05T10:30:00'),
  value: 'Detailed response to the call to action',
  policy_basis: ['FERPA', 'COPPA'],
  tags: ['response', 'completed'],
  severity: 0.6,
  severity_reasons: ['Moderate severity'],
  inferred: false,
  sentiment: 0.7,
  sentiment_reasons: ['Positive response'],
  compliance_average_chapter_13: 0.85,
  compliance_chapter_13_reasons: ['Meets Chapter 13 requirements'],
};

const mockRelatedCTA = {
  propertyId: 'cta-test-id',
  documentId: 1,
  createdOn: new Date('2023-01-01'),
  value: 'Original call to action that this responds to',
  completion_percentage: 75,
  inferred: false,
  opened_date: new Date('2023-01-01'),
  compliancy_close_date: new Date('2023-02-01'),
  closed_date: null,
  compliance_date_enforceable: true,
};

describe('ResponsiveActionPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedClient.getCallToAction.mockResolvedValue({
      results: [mockRelatedCTA],
      pageStats: { page: 1, num: 10, total: 1 },
    });
  });

  it('renders responsive action details correctly', async () => {
    render(<ResponsiveActionPanel row={mockResponseDetails} />);

    expect(
      screen.getByText('Responsive Action (response-test-id)'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Detailed response to the call to action'),
    ).toBeInTheDocument();
    expect(screen.getByText('80% Complete')).toBeInTheDocument();
  });

  it('displays progress bar with correct value', async () => {
    render(<ResponsiveActionPanel row={mockResponseDetails} />);

    const progressBar = screen.getByTestId('linear-progress');
    expect(progressBar).toHaveAttribute('data-value', '80');
  });

  it('shows response timestamp correctly', async () => {
    render(<ResponsiveActionPanel row={mockResponseDetails} />);

    expect(screen.getByText(/Jan 5, 2023/)).toBeInTheDocument();
  });

  it('displays status chips correctly', async () => {
    render(<ResponsiveActionPanel row={mockResponseDetails} />);

    expect(screen.getByText('Direct')).toBeInTheDocument(); // since inferred is false
  });

  it('shows all scores correctly', async () => {
    render(<ResponsiveActionPanel row={mockResponseDetails} />);

    expect(screen.getByText('0.60')).toBeInTheDocument(); // severity
    expect(screen.getByText('0.70')).toBeInTheDocument(); // sentiment
    expect(screen.getByText('0.85')).toBeInTheDocument(); // compliance_average_chapter_13
  });

  it('displays policy basis and tags in metadata', async () => {
    render(<ResponsiveActionPanel row={mockResponseDetails} />);

    expect(screen.getByText('FERPA')).toBeInTheDocument();
    expect(screen.getByText('COPPA')).toBeInTheDocument();
    expect(screen.getByText('response')).toBeInTheDocument();
    expect(screen.getByText('completed')).toBeInTheDocument();
  });

  it('fetches and displays related call-to-action', async () => {
    render(<ResponsiveActionPanel row={mockResponseDetails} />);

    await waitFor(() => {
      expect(mockedClient.getCallToAction).toHaveBeenCalledWith({
        emailId: 'test-email-id',
        page: 1,
        num: 100,
      });
    });

    await waitFor(() => {
      expect(screen.getByText('Call-to-Action Details')).toBeInTheDocument();
      expect(
        screen.getByText('Original call to action that this responds to'),
      ).toBeInTheDocument();
    });
  });

  it('shows loading state while fetching related CTA', async () => {
    // Make the API call take some time
    mockedClient.getCallToAction.mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                results: [mockRelatedCTA],
                pageStats: { page: 1, num: 10, total: 1 },
              }),
            100,
          ),
        ) as any,
    );

    render(<ResponsiveActionPanel row={mockResponseDetails} />);

    expect(screen.getByTestId('circular-progress')).toBeInTheDocument();
  });

  it('handles API error gracefully', async () => {
    mockedClient.getCallToAction.mockRejectedValue(new Error('API Error'));

    render(<ResponsiveActionPanel row={mockResponseDetails} />);

    await waitFor(() => {
      expect(
        screen.getByText('Failed to load related call-to-action'),
      ).toBeInTheDocument();
    });
  });

  it('handles no related CTA found', async () => {
    mockedClient.getCallToAction.mockResolvedValue({
      results: [],
      pageStats: { page: 1, num: 10, total: 0 },
    });

    render(<ResponsiveActionPanel row={mockResponseDetails} />);

    await waitFor(() => {
      expect(
        screen.getByText('No related call-to-action found.'),
      ).toBeInTheDocument();
    });
  });

  it('displays reasoning sections when available', async () => {
    render(<ResponsiveActionPanel row={mockResponseDetails} />);

    expect(screen.getByText('Analysis and Reasoning')).toBeInTheDocument();
    expect(screen.getByText('Moderate severity')).toBeInTheDocument();
    expect(screen.getByText('Positive response')).toBeInTheDocument();
    expect(
      screen.getByText('Meets Chapter 13 requirements'),
    ).toBeInTheDocument();
  });

  it('handles missing optional fields gracefully', async () => {
    const minimalResponse: CallToActionResponseDetails = {
      propertyId: 'response-minimal',
      documentId: 1,
      createdOn: new Date('2023-01-05'),
      actionPropertyId: 'cta-test-id',
      completionPercentage: 50,
      responseTimestamp: new Date('2023-01-05'),
      value: 'Minimal response',
    };

    render(<ResponsiveActionPanel row={minimalResponse} />);

    expect(screen.getByText('Minimal response')).toBeInTheDocument();
    expect(screen.getByText('50% Complete')).toBeInTheDocument();
  });
});
