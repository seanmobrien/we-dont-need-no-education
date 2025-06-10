import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { EmailHeaderPanel } from '@/app/messages/email/[emailId]/email-header/panel';
import { EmailProperty } from '@/data-models/api';

// Mock MUI components to avoid theme provider issues
jest.mock('@/components/mui/data-grid', () => ({
  EmailMasterPanel: ({ title, row }: { title: string; row: EmailProperty }) => (
    <div data-testid="email-master-panel">
      <h1>{title}</h1>
      <div data-testid="value">{row.value}</div>
      <div data-testid="policy-basis">
        {row.policy_basis?.map((item, index) => (
          <span key={index}>{item}</span>
        ))}
      </div>
      <div data-testid="tags">
        {row.tags?.map((item, index) => (
          <span key={index}>{item}</span>
        ))}
      </div>
    </div>
  ),
}));

const mockEmailProperty: EmailProperty = {
  propertyId: 'test-id',
  documentId: 1,
  typeId: 1,
  createdOn: new Date('2023-01-01'),
  value: 'test-value',
  policy_basis: ['policy1', 'policy2'],
  tags: ['tag1', 'tag2'],
};

describe('EmailHeaderPanel', () => {
  it('renders with EmailMasterPanel and correct title', () => {
    render(<EmailHeaderPanel row={mockEmailProperty} />);
    
    expect(screen.getByTestId('email-master-panel')).toBeInTheDocument();
    expect(screen.getByText('Email Header')).toBeInTheDocument();
    expect(screen.getByTestId('value')).toHaveTextContent('test-value');
  });

  it('displays policy basis and tags', () => {
    render(<EmailHeaderPanel row={mockEmailProperty} />);
    
    expect(screen.getByTestId('policy-basis')).toBeInTheDocument();
    expect(screen.getByTestId('tags')).toBeInTheDocument();
    expect(screen.getByText('policy1')).toBeInTheDocument();
    expect(screen.getByText('tag1')).toBeInTheDocument();
  });
});