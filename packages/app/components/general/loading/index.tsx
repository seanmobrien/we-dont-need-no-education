'use client';

/**
 * General-purpose loading and error indicator components.
 *
 * This module provides a compact UI primitive to render a Material UI Card with
 * a LinearProgress while an operation is in progress, and a lightweight inline
 * error presentation when an error occurs. When neither loading nor error is
 * active, it renders nothing (an empty fragment) so it can be dropped into any
 * layout without affecting spacing.
 */
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import LinearProgress from '@mui/material/LinearProgress';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import { useEffect, useId, useRef } from 'react';
import type { SxProps, Theme } from '@mui/material/styles';

/**
 * Stable, hoisted styles used by the error view to avoid re-allocating
 * style objects on every render.
 */
const stableSx = {
  error: {
    color: 'error.main',
    marginBottom: 2,
    textAlign: 'center',
  } satisfies SxProps<Theme>,
} as const;

/**
 * Loading
 *
 * Renders one of three states:
 * - Loading state: Card with title text and a determinate LinearProgress.
 * - Error state: Inline red error message when `errorMessage` is provided and `loading` is falsey.
 * - Idle state: Empty fragment when neither `loading` nor `errorMessage` is present.
 *
 * Accessibility: Loading and Error states contain appropriate ARIA roles and properties for screen readers.
 *
 * @param props Component props
 * @param props.loading Whether to display the loading Card. When true, `errorMessage` is ignored.
 * @param props.text Optional text shown above the progress bar (defaults to "Loading...")
 * @param props.errorMessage Optional error string. When truthy and not loading, renders an inline error.
 */
export const Loading = ({
  loading,
  errorMessage,
  text,
}: {
  loading?: boolean;
  text?: string;
  errorMessage?: string | null;
}) => {
  const titleId = useId();
  const errorRef = useRef<HTMLDivElement | null>(null);

  // Move focus to the alert when an error appears so SR/keyboard users notice it
  useEffect(() => {
    if (errorMessage && errorRef.current) {
      errorRef.current.focus();
    }
  }, [errorMessage]);

  if (loading) {
    return (
      <Card
        role="status"
        aria-live="polite"
        aria-busy={true}
        aria-labelledby={titleId}
      >
        <CardContent>
          <Typography id={titleId} variant="h6" gutterBottom>
            {text ?? 'Loading...'}
          </Typography>
          <LinearProgress aria-describedby={titleId} />
        </CardContent>
      </Card>
    );
  }
  if (errorMessage) {
    return (
      <Box
        sx={stableSx.error}
        role="alert"
        aria-atomic="true"
        tabIndex={-1}
        ref={errorRef}
      >
        <Typography variant="body2" color="error">
          <strong>Error:</strong> {errorMessage}
        </Typography>
      </Box>
    );
  }
  return <></>;
};
