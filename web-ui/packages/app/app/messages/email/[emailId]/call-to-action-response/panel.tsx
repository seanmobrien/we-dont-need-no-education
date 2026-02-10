import React from 'react';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Divider from '@mui/material/Divider';
import LinearProgress from '@mui/material/LinearProgress';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import Link from '@mui/material/Link';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import Paper from '@mui/material/Paper';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { useQuery } from '@tanstack/react-query';
import {
  CallToActionResponseDetails,
  CallToActionDetails,
} from '@/data-models/api';
import { useParams } from 'next/navigation';
import { EmailMasterPanel } from '@/components/mui/data-grid';
import { fetch } from '@/lib/nextjs-util/fetch';

const formatDate = (date: Date | null): string => {
  if (typeof date === 'string') {
    date = new Date(Date.parse(date));
  }
  if (!date) return 'Not set';
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

const formatPercentage = (value: number | null): string => {
  if (value === null || value === undefined) return 'N/A';
  return `${Math.round(value)}%`;
};

const formatScore = (value: number | null): string => {
  if (value === null || value === undefined) return 'N/A';
  return value.toFixed(2);
};

const ResponsiveActionPanelContent = ({
  row,
}: {
  row: CallToActionResponseDetails;
}) => {
  const { emailId } = useParams();

  // Use React Query to fetch call-to-action data
  const {
    data: callToActionData,
    isLoading: loading,
    error,
  } = useQuery({
    queryKey: ['properties/call-to-action', emailId],
    queryFn: async () => {
      const response = await fetch(
        `/api/email/${emailId}/properties/call-to-action`,
      );
      if (!response.ok) {
        throw new Error('Failed to fetch call-to-action data');
      }
      return response.json();
    },
    enabled: !!emailId,
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    retry: 2,
  });

  // Find the related CTA from the fetched data
  const relatedCTA =
    callToActionData?.results?.find(
      (cta: CallToActionDetails) => cta.propertyId === row.actionPropertyId,
    ) || null;
  return (
    <>
      {/* Progress and Timing */}
      <Grid container spacing={2}>
        <Grid gridColumn={{ xs: 12, md: 6 }}>
          <Typography variant="h6" gutterBottom>
            Completion Progress
          </Typography>
          <Box sx={{ mb: 1 }}>
            <Typography variant="body2" color="textSecondary">
              {formatPercentage(row.completionPercentage)} Complete
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={row.completionPercentage || 0}
            sx={{ height: 8, borderRadius: 1 }}
            data-testid="linear-progress"
          />
        </Grid>
        <Grid gridColumn={{ xs: 12, md: 6 }}>
          <Typography variant="h6" gutterBottom>
            Response Timing
          </Typography>
          <Typography variant="body1" fontWeight="bold">
            {formatDate(row.responseTimestamp)}
          </Typography>
        </Grid>
      </Grid>

      {/* Status Indicators */}
      <Box>
        <Typography variant="h6" gutterBottom>
          Status
        </Typography>
        <Stack direction="row" spacing={1} flexWrap="wrap">
          {row.inferred !== undefined && (
            <Chip
              label={row.inferred ? 'Inferred' : 'Direct'}
              color={row.inferred ? 'secondary' : 'primary'}
              size="small"
            />
          )}
        </Stack>
      </Box>

      {/* Scores and Ratings */}
      <Grid container spacing={2}>
        <Grid gridColumn={{ xs: 12, md: 4 }}>
          <Typography variant="subtitle1" fontWeight="bold">
            Severity Score
          </Typography>
          <Typography variant="body2">
            {formatScore(row.severity ?? null)}
          </Typography>
        </Grid>
        <Grid gridColumn={{ xs: 12, md: 4 }}>
          <Typography variant="subtitle1" fontWeight="bold">
            Sentiment Score
          </Typography>
          <Typography variant="body2">
            {formatScore(row.sentiment ?? null)}
          </Typography>
        </Grid>
        <Grid gridColumn={{ xs: 12, md: 4 }}>
          <Typography variant="subtitle1" fontWeight="bold">
            Chapter 13 Compliance
          </Typography>
          <Typography variant="body2">
            {formatScore(row.compliance_average_chapter_13 ?? null)}
          </Typography>
        </Grid>
      </Grid>

      <Divider />

      {/* Expandable Sections */}
      <Stack spacing={1}>
        {/* Reasons and Analysis */}
        {(row.severity_reasons?.length ||
          row.sentiment_reasons?.length ||
          row.compliance_chapter_13_reasons?.length) && (
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="h6">Analysis and Reasoning</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Stack spacing={2}>
                {row.severity_reasons?.length && (
                  <Box>
                    <Typography variant="subtitle1" fontWeight="bold">
                      Severity Reasons
                    </Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap">
                      {row.severity_reasons.map((reason, index) => (
                        <Chip
                          key={index}
                          label={reason}
                          variant="outlined"
                          size="small"
                        />
                      ))}
                    </Stack>
                  </Box>
                )}
                {row.sentiment_reasons?.length && (
                  <Box>
                    <Typography variant="subtitle1" fontWeight="bold">
                      Sentiment Reasons
                    </Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap">
                      {row.sentiment_reasons.map((reason, index) => (
                        <Chip
                          key={index}
                          label={reason}
                          variant="outlined"
                          size="small"
                        />
                      ))}
                    </Stack>
                  </Box>
                )}
                {row.compliance_chapter_13_reasons?.length && (
                  <Box>
                    <Typography variant="subtitle1" fontWeight="bold">
                      Chapter 13 Compliance Reasons
                    </Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap">
                      {row.compliance_chapter_13_reasons.map(
                        (reason, index) => (
                          <Chip
                            key={index}
                            label={reason}
                            variant="outlined"
                            size="small"
                          />
                        ),
                      )}
                    </Stack>
                  </Box>
                )}
              </Stack>
            </AccordionDetails>
          </Accordion>
        )}

        {/* Related Call-to-Action */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="h6">Related Call-to-Action</Typography>
          </AccordionSummary>
          <AccordionDetails>
            {loading ? (
              <Box display="flex" justifyContent="center" p={2}>
                <CircularProgress size={24} data-testid="circular-progress" />
              </Box>
            ) : error ? (
              <>
                <Alert severity="error">
                  {typeof error === 'object' && !!error && 'message' in error
                    ? error.message
                    : 'Failed to load related call-to-action'}
                </Alert>
              </>
            ) : !relatedCTA ? (
              <Typography variant="body2" color="textSecondary">
                No related call-to-action found.
              </Typography>
            ) : (
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="flex-start"
                >
                  <Box flex={1}>
                    <Typography
                      variant="subtitle1"
                      fontWeight="bold"
                      gutterBottom
                    >
                      Call-to-Action Details
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      {relatedCTA.value}
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid gridColumn={{ xs: 6 }}>
                        <Typography variant="caption" color="textSecondary">
                          Completion:{' '}
                          {formatPercentage(relatedCTA.completion_percentage)}
                        </Typography>
                      </Grid>
                      <Grid gridColumn={{ xs: 6 }}>
                        <Typography variant="caption" color="textSecondary">
                          Status: {relatedCTA.inferred ? 'Inferred' : 'Direct'}
                        </Typography>
                      </Grid>
                      <Grid gridColumn={{ xs: 6 }}>
                        <Typography variant="caption" color="textSecondary">
                          Opened: {formatDate(relatedCTA.opened_date)}
                        </Typography>
                      </Grid>
                      <Grid gridColumn={{ xs: 6 }}>
                        <Typography variant="caption" color="textSecondary">
                          Due: {formatDate(relatedCTA.compliancy_close_date)}
                        </Typography>
                      </Grid>
                    </Grid>
                  </Box>
                  <Link
                    href={`/messages/email/${emailId}/call-to-action?highlight=${relatedCTA.propertyId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{ ml: 2 }}
                  >
                    <OpenInNewIcon fontSize="small" />
                  </Link>
                </Stack>
              </Paper>
            )}
          </AccordionDetails>
        </Accordion>
      </Stack>
    </>
  );
};

export const ResponsiveActionPanel = ({
  row,
}: {
  row: CallToActionResponseDetails;
}) => {
  return (
    <EmailMasterPanel title="Responsive Action" row={row}>
      <ResponsiveActionPanelContent row={row} />
    </EmailMasterPanel>
  );
};

export default ResponsiveActionPanel;
