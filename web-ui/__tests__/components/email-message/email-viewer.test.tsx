import React from 'react';
import { render, screen } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { createTheme } from '@mui/material/styles';
import EmailViewer from '@/components/email-message/email-viewer';

// Mock the API modules
jest.mock('@/lib/api/client', () => ({
  getEmail: jest.fn(),
}));

jest.mock('@/lib/logger', () => ({
  log: jest.fn(),
}));

jest.mock('@/lib/react-util', () => ({
  isError: jest.fn(),
  LoggedError: {
    isTurtlesAllTheWayDownBaby: jest.fn(),
  },
}));

jest.mock('@/lib/typescript', () => ({
  AbortablePromise: {
    isOperationCancelledError: jest.fn(() => false),
  },
}));

// Mock fetch
global.fetch = jest.fn();

const theme = createTheme();

const EmailViewerWrapper = ({ emailId }: { emailId: string }) => (
  <ThemeProvider theme={theme}>
    <EmailViewer emailId={emailId} />
  </ThemeProvider>
);

describe('EmailViewer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state initially', () => {
    render(<EmailViewerWrapper emailId="test-email-id" />);
    
    expect(screen.getByText('Loading Email...')).toBeInTheDocument();
  });

  it('renders with valid emailId prop', () => {
    render(<EmailViewerWrapper emailId="test-email-id" />);
    
    // Should render the component without crashing
    expect(screen.getByText('Loading Email...')).toBeInTheDocument();
  });
});