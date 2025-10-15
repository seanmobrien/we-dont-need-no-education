 
import React from 'react';
import { waitFor, act } from '@testing-library/react';
import { render, screen } from '@/__tests__/test-utils';
import { ResponsiveActionPanel } from '@/app/messages/email/[emailId]/call-to-action-response/panel';
import { CallToActionResponseDetails } from '@/data-models/api';
import { fetch } from '@/lib/nextjs-util/fetch';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useParams: () => ({ emailId: 'test-email-id' }),
}));

const mockResponseDetails: CallToActionResponseDetails = {
  propertyId: 'response-test-id',
  documentId: 1,
  createdOn: new Date('2023-01-05'),
  categoryId: 1,
  categoryName: 'Call to Action Response',
  typeName: 'CTA Response',
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
beforeEach(() => {
  // Clear and setup fetch mock - it's already mocked globally in jest.setup.ts
  (fetch as jest.Mock).mockClear();
  (fetch as jest.Mock).mockResolvedValue({
    ok: true,
    json: async () => ({
      results: [mockRelatedCTA],
      pageStats: { page: 1, num: 10, total: 1 },
    }),
  });
});

describe('ResponsiveActionPanel', () => {
  it('renders responsive action details correctly', async () => {
    render(<ResponsiveActionPanel row={mockResponseDetails} />);

    await waitFor(() =>
      screen.getByText('Detailed response to the call to action'),
    );

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

    await waitFor(() => screen.getByTestId('linear-progress'));

    const progressBar = screen.getByTestId('linear-progress');
    expect(progressBar).toHaveAttribute('aria-valuenow', '80');
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
      expect(fetch as jest.Mock).toHaveBeenCalledWith(
        '/api/email/test-email-id/properties/call-to-action',
      );
    });

    // Wait for the Related Call-to-Action accordion to be present
    await waitFor(() => {
      expect(screen.getByText('Related Call-to-Action')).toBeInTheDocument();
    });

    // Click on the accordion to expand it (wrapped in act to avoid warnings)
    const accordionButton = screen.getByText('Related Call-to-Action');
    await act(async () => {
      accordionButton.click();
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
    (fetch as jest.Mock).mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                ok: true,
                json: async () => ({
                  results: [mockRelatedCTA],
                  pageStats: { page: 1, num: 10, total: 1 },
                }),
              }),
            100,
          ),
        ) as any,
    );

    render(<ResponsiveActionPanel row={mockResponseDetails} />);

    expect(screen.getByTestId('circular-progress')).toBeInTheDocument();
  });

  it('handles no related CTA found', async () => {
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        results: [],
        pageStats: { page: 1, num: 10, total: 0 },
      }),
    });

    render(<ResponsiveActionPanel row={mockResponseDetails} />);

    // Wait for the Related Call-to-Action accordion to be present
    await waitFor(() => {
      expect(screen.getByText('Related Call-to-Action')).toBeInTheDocument();
    });

    // Click on the accordion to expand it (wrapped in act to avoid warnings)
    const accordionButton = screen.getByText('Related Call-to-Action');
    await act(async () => {
      accordionButton.click();
    });

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
      categoryId: 1,
      categoryName: 'Call to Action Response',
      typeName: 'CTA Response',
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
