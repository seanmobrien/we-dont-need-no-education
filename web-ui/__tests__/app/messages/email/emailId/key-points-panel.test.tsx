import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { KeyPointsPanel } from '@/app/messages/email/[emailId]/key-points/panel';
import { KeyPointsDetails } from '@/data-models/api';

// Mock MUI components that may cause theme issues
jest.mock('@mui/material/LinearProgress', () => ({ 
  value, color, ...props 
}: { 
  value?: number;
  color?: string;
}) => <div data-testid="linear-progress" data-value={value} data-color={color} {...props} />);

jest.mock('@mui/material/Rating', () => ({ 
  value, ...props 
}: { 
  value?: number;
}) => <div data-testid="rating" data-value={value} {...props} />);

const mockKeyPointsDetails: KeyPointsDetails = {
  propertyId: 'keypoint-test-id',
  documentId: 1,
  createdOn: new Date('2023-01-01T08:00:00'),
  value: 'This is an important key point that requires attention',
  policy_basis: ['FERPA', 'ADA'],
  tags: ['critical', 'privacy'],
  relevance: 0.9,
  compliance: 0.7,
  severity: 0.6,
  inferred: true,
};

describe('KeyPointsPanel', () => {
  it('renders key point details correctly', () => {
    render(<KeyPointsPanel row={mockKeyPointsDetails} />);
    
    expect(screen.getByText('Key Point')).toBeInTheDocument();
    expect(screen.getByText('This is an important key point that requires attention')).toBeInTheDocument();
  });

  it('displays status chip correctly', () => {
    render(<KeyPointsPanel row={mockKeyPointsDetails} />);
    
    expect(screen.getByText('Inferred')).toBeInTheDocument(); // since inferred is true
  });

  it('shows all assessment scores', () => {
    render(<KeyPointsPanel row={mockKeyPointsDetails} />);
    
    expect(screen.getByText('0.90')).toBeInTheDocument(); // relevance
    expect(screen.getByText('0.70')).toBeInTheDocument(); // compliance
    expect(screen.getByText('0.60')).toBeInTheDocument(); // severity
  });

  it('displays progress bars with correct values', () => {
    render(<KeyPointsPanel row={mockKeyPointsDetails} />);
    
    const progressBars = screen.getAllByTestId('linear-progress');
    expect(progressBars).toHaveLength(3);
    
    // Check that progress bars have correct values (converted to percentages)
    expect(progressBars[0]).toHaveAttribute('data-value', '90'); // relevance: 0.9 * 100
    expect(progressBars[1]).toHaveAttribute('data-value', '70'); // compliance: 0.7 * 100
    expect(progressBars[2]).toHaveAttribute('data-value', '60'); // severity: 0.6 * 100
  });

  it('displays ratings with correct values', () => {
    render(<KeyPointsPanel row={mockKeyPointsDetails} />);
    
    const ratings = screen.getAllByTestId('rating');
    expect(ratings).toHaveLength(3);
    
    // Check that ratings have correct values (converted to 5-star scale)
    expect(ratings[0]).toHaveAttribute('data-value', '4.5'); // relevance: 0.9 * 5
    expect(ratings[1]).toHaveAttribute('data-value', '3.5'); // compliance: 0.7 * 5
    expect(ratings[2]).toHaveAttribute('data-value', '3'); // severity: 0.6 * 5
  });

  it('displays formatted creation date', () => {
    render(<KeyPointsPanel row={mockKeyPointsDetails} />);
    
    expect(screen.getByText(/Jan 1, 2023/)).toBeInTheDocument();
  });

  it('displays property ID in metadata', () => {
    render(<KeyPointsPanel row={mockKeyPointsDetails} />);
    
    expect(screen.getByText('keypoint-test-id')).toBeInTheDocument();
  });

  it('displays policy basis and tags in metadata', () => {
    render(<KeyPointsPanel row={mockKeyPointsDetails} />);
    
    expect(screen.getByText('FERPA')).toBeInTheDocument();
    expect(screen.getByText('ADA')).toBeInTheDocument();
    expect(screen.getByText('critical')).toBeInTheDocument();
    expect(screen.getByText('privacy')).toBeInTheDocument();
  });

  it('handles null scores gracefully', () => {
    const keyPointWithNullScores: KeyPointsDetails = {
      ...mockKeyPointsDetails,
      relevance: null,
      compliance: null,
      severity: null,
    };

    render(<KeyPointsPanel row={keyPointWithNullScores} />);
    
    const naTexts = screen.getAllByText('N/A');
    expect(naTexts).toHaveLength(3); // One for each null score
  });

  it('handles missing policy basis and tags', () => {
    const keyPointWithoutMetadata: KeyPointsDetails = {
      ...mockKeyPointsDetails,
      policy_basis: undefined,
      tags: undefined,
    };

    render(<KeyPointsPanel row={keyPointWithoutMetadata} />);
    
    expect(screen.getByText('No policy basis specified')).toBeInTheDocument();
    expect(screen.getByText('No tags specified')).toBeInTheDocument();
  });

  it('shows direct status for non-inferred key points', () => {
    const directKeyPoint: KeyPointsDetails = {
      ...mockKeyPointsDetails,
      inferred: false,
    };

    render(<KeyPointsPanel row={directKeyPoint} />);
    
    expect(screen.getByText('Direct')).toBeInTheDocument();
  });

  it('shows correct color coding for progress bars based on scores', () => {
    render(<KeyPointsPanel row={mockKeyPointsDetails} />);
    
    const progressBars = screen.getAllByTestId('linear-progress');
    
    // High score (0.9) should be success
    expect(progressBars[0]).toHaveAttribute('data-color', 'success');
    // Medium score (0.7) should be warning
    expect(progressBars[1]).toHaveAttribute('data-color', 'warning');
    // Lower score (0.6) should be warning
    expect(progressBars[2]).toHaveAttribute('data-color', 'warning');
  });
});