/**
 * Test to verify EmailDetailPanel component works correctly
 * This is a minimal test to check component renders without crashing
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import EmailDetailPanel from '../../../components/email-message/list/email-detail-panel';
import { EmailMessageSummary } from '../../../data-models/api/email-message';

// Mock the API functions
jest.mock('../../../lib/api/client', () => ({
  getEmail: jest.fn(() => Promise.resolve({
    emailId: 'test-email-123',
    sender: { contactId: '1', name: 'Test Sender', email: 'sender@test.com' },
    subject: 'Test Email Subject',
    sentOn: new Date('2023-01-01T10:00:00Z'),
    recipients: [],
    body: 'Test email body content',
  })),
}));

jest.mock('../../../lib/api/email/properties/client', () => ({
  getKeyPoints: jest.fn(() => Promise.resolve({ results: [] })),
  getCallToAction: jest.fn(() => Promise.resolve({ results: [] })),
  getCallToActionResponse: jest.fn(() => Promise.resolve({ results: [] })),
  getSentimentAnalysis: jest.fn(() => Promise.resolve({ results: [] })),
  getNotes: jest.fn(() => Promise.resolve({ results: [] })),
}));

const mockEmailSummary: EmailMessageSummary = {
  emailId: 'test-email-123',
  sender: {
    contactId: '1',
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

describe('EmailDetailPanel', () => {
  it('renders without crashing and shows loading state initially', () => {
    render(<EmailDetailPanel row={mockEmailSummary} />);
    
    // Component should render and show loading state initially
    expect(screen.getByText('Loading Email Details...')).toBeInTheDocument();
  });

  it('shows email summary when no full email data is loaded', async () => {
    // Create a different email summary to avoid cached email state
    const summaryOnly = {
      ...mockEmailSummary,
      emailId: 'different-email-id',
    };

    render(<EmailDetailPanel row={summaryOnly} />);
    
    // Wait for the loading to complete and component to settle
    await waitFor(() => {
      expect(screen.queryByText('Loading Email Details...')).not.toBeInTheDocument();
    }, { timeout: 3000 });

    // Should show email summary content
    expect(screen.getByText('Test Email Subject')).toBeInTheDocument();
    expect(screen.getByText(/Test Sender/)).toBeInTheDocument();
  });
});