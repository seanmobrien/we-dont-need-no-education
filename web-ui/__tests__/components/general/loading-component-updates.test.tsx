import React from 'react';
import { render, screen } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { createTheme } from '@mui/material/styles';
import Loading from '@/components/general/loading';

const theme = createTheme();

const LoadingWrapper = ({
  loading,
  errorMessage,
}: {
  loading: boolean;
  errorMessage: string | null;
}) => (
  <ThemeProvider theme={theme}>
    <Loading loading={loading} errorMessage={errorMessage} />
  </ThemeProvider>
);

describe('Loading Component Updates', () => {
  it('renders loading state with Card-based UI pattern', () => {
    render(<LoadingWrapper loading={true} errorMessage={null} />);

    // Check that we're now using the Card-based pattern from email-viewer
    expect(screen.getByText('Loading...')).toBeInTheDocument();

    // Verify we have the card structure
    const cardContent = document.querySelector('.MuiCardContent-root');
    expect(cardContent).toBeInTheDocument();

    // Verify we have LinearProgress instead of CircularProgress
    const linearProgress = document.querySelector('.MuiLinearProgress-root');
    expect(linearProgress).toBeInTheDocument();

    // Verify we don't have CircularProgress anymore
    const circularProgress = document.querySelector(
      '.MuiCircularProgress-root',
    );
    expect(circularProgress).not.toBeInTheDocument();
  });

  it('maintains compatibility with existing error message behavior', () => {
    const errorMessage = 'Test error message';
    render(<LoadingWrapper loading={false} errorMessage={errorMessage} />);

    expect(screen.getByText('Error:')).toBeInTheDocument();
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  it('renders nothing when not loading and no error', () => {
    const { container } = render(
      <LoadingWrapper loading={false} errorMessage={null} />,
    );
    expect(container.firstChild).toBeNull();
  });
});
