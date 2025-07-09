import React from 'react';
import {
  Typography,
  Chip,
  Box,
  Grid,
  Divider,
  LinearProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Link,
  Alert,
  CircularProgress,
  Stack,
  Button,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import {
  CallToActionDetails,
  CallToActionResponseDetails,
} from '@/data-models/api';
import { getCallToActionResponse } from '@/lib/api/email/properties/client';
import { useParams } from 'next/navigation';
import { EmailMasterPanel } from '@/components/mui/data-grid';
import { useQuery } from '@tanstack/react-query';

// Stable CSS grid configurations
const GRID_CONFIGS = {
  progressSection: { xs: 12, md: 6 },
  statusSection: { xs: 12, md: 6 },
  dateColumn: { xs: 12, md: 4 },
  scoreColumn: { xs: 6, md: 3 },
} as const;

// Stable MUI component styles
const COMPONENT_STYLES = {
  progressBar: { height: 8, borderRadius: 1 },
  centeredBox: { display: 'flex', justifyContent: 'center', py: 2 },
  responseBox: { p: 2, border: '1px solid #e0e0e0', borderRadius: 1 },
  linkStyle: { display: 'flex', alignItems: 'center', gap: 0.5 },
  marginBottom: { mb: 1 },
} as const;

const formatDate = (date: Date | null): string => {
  if (!date) return 'Not set';
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
};

const formatScore = (value: number | null): string => {
  if (value === null || value === undefined) return 'N/A';
  return value.toFixed(2);
};

const CallToActionPanelContent = ({ row }: { row: CallToActionDetails }) => {
  const { emailId } = useParams();

  // Use TanStack React Query for data fetching
  const {
    data: relatedResponses = [],
    isLoading: loading,
    error,
  } = useQuery({
    queryKey: ['callToActionResponses', emailId, row.propertyId],
    queryFn: async (): Promise<CallToActionResponseDetails[]> => {
      const result = await getCallToActionResponse({
        emailId: emailId as string,
        page: 1,
        num: 100, // Get all related responses
      });

      // Filter responses related to this call-to-action
      return (
        result.results?.filter(
          (response: CallToActionResponseDetails) =>
            response.actionPropertyId === row.propertyId,
        ) || []
      );
    },
    enabled: Boolean(row.propertyId && emailId),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });

  return (
    <>
      {/* Progress and Status */}
      <Grid container spacing={2}>
        <Grid gridColumn={GRID_CONFIGS.progressSection}>
          <Typography variant="h6" gutterBottom>
            Completion Progress
          </Typography>
          <Box sx={COMPONENT_STYLES.marginBottom}>
            <Typography variant="body2" sx={COMPONENT_STYLES.marginBottom}>
              {row.completion_percentage}% Complete
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={row.completion_percentage}
            sx={COMPONENT_STYLES.progressBar}
          />
        </Grid>
        <Grid gridColumn={GRID_CONFIGS.statusSection}>
          <Typography variant="h6" gutterBottom>
            Status Indicators
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap">
            <Chip
              label={row.inferred ? 'Inferred' : 'Direct'}
              color={row.inferred ? 'secondary' : 'primary'}
              size="small"
            />
            <Chip
              label={
                row.compliance_date_enforceable
                  ? 'Enforceable'
                  : 'Not Enforceable'
              }
              color={row.compliance_date_enforceable ? 'warning' : 'default'}
              size="small"
            />
          </Stack>
        </Grid>
      </Grid>

      <Divider />

      {/* Dates */}
      <Grid container spacing={2}>
        <Grid gridColumn={GRID_CONFIGS.dateColumn}>
          <Typography variant="subtitle1" fontWeight="bold">
            Opened Date
          </Typography>
          <Typography variant="body2">{formatDate(row.opened_date)}</Typography>
        </Grid>
        <Grid gridColumn={GRID_CONFIGS.dateColumn}>
          <Typography variant="subtitle1" fontWeight="bold">
            Closed Date
          </Typography>
          <Typography variant="body2">{formatDate(row.closed_date)}</Typography>
        </Grid>
        <Grid gridColumn={GRID_CONFIGS.dateColumn}>
          <Typography variant="subtitle1" fontWeight="bold">
            Compliance Due
          </Typography>
          <Typography variant="body2">
            {formatDate(row.compliancy_close_date)}
          </Typography>
        </Grid>
        <Grid gridColumn={GRID_CONFIGS.dateColumn}>
          <Typography variant="subtitle1" fontWeight="bold">
            Timeline
          </Typography>
          <Typography variant="body2">
            <Button
              href={`call-to-action/${row.propertyId}/timeline`}
              variant="outlined"
              size="small"
              color="primary"
            >
              Generate
            </Button>
          </Typography>
        </Grid>
      </Grid>

      <Divider />

      {/* Scores Section */}
      <Grid container spacing={2}>
        <Grid gridColumn={GRID_CONFIGS.scoreColumn}>
          <Typography variant="subtitle1" fontWeight="bold">
            Compliance Rating
          </Typography>
          <Typography variant="h6">
            {formatScore(row.compliance_rating ?? null)}
          </Typography>
        </Grid>
        <Grid gridColumn={GRID_CONFIGS.scoreColumn}>
          <Typography variant="subtitle1" fontWeight="bold">
            Severity
          </Typography>
          <Typography variant="h6">
            {formatScore(row.severity ?? null)}
          </Typography>
        </Grid>
        <Grid gridColumn={GRID_CONFIGS.scoreColumn}>
          <Typography variant="subtitle1" fontWeight="bold">
            Sentiment
          </Typography>
          <Typography variant="h6">
            {formatScore(row.sentiment ?? null)}
          </Typography>
        </Grid>
        <Grid gridColumn={GRID_CONFIGS.scoreColumn}>
          <Typography variant="subtitle1" fontWeight="bold">
            Title IX
          </Typography>
          <Typography variant="h6">
            {formatScore(row.title_ix_applicable ?? null)}
          </Typography>
        </Grid>
      </Grid>

      <Divider />

      {/* Closure Actions */}
      {row.closure_actions?.length && (
        <>
          <Box>
            <Typography variant="h6" gutterBottom>
              Closure Actions
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap">
              {row.closure_actions.map((action, index) => (
                <Chip
                  key={index}
                  label={action}
                  variant="outlined"
                  color="primary"
                />
              ))}
            </Stack>
          </Box>
          <Divider />
        </>
      )}

      {/* Related Responses */}
      {loading ? (
        <Box sx={COMPONENT_STYLES.centeredBox}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert
          severity="error"
          action={
            <Typography>
              {error instanceof Error
                ? error.message
                : 'Failed to load related responses'}
            </Typography>
          }
        />
      ) : (
        <Box>
          <Typography variant="h6" gutterBottom>
            Related Responsive Actions ({relatedResponses.length})
          </Typography>
          {relatedResponses.length > 0 ? (
            <Stack spacing={1}>
              {relatedResponses.map((response) => (
                <Box
                  key={response.propertyId}
                  sx={COMPONENT_STYLES.responseBox}
                >
                  <Typography variant="body1" gutterBottom>
                    {response.value}
                  </Typography>
                  <Link
                    href={`/messages/email/${emailId}/call-to-action-response?propertyId=${response.propertyId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={COMPONENT_STYLES.linkStyle}
                  >
                    View Details <OpenInNewIcon fontSize="small" />
                  </Link>
                </Box>
              ))}
            </Stack>
          ) : (
            <Typography variant="body2" color="textSecondary">
              No related responsive actions found.
            </Typography>
          )}
        </Box>
      )}

      {/* Expandable Reasoning Section */}
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">Reasoning and Analysis</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Stack spacing={2}>
            {row.reasonable_reasons?.length && (
              <Box>
                <Typography variant="subtitle1" fontWeight="bold">
                  Reasonable Request Reasons
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap">
                  {row.reasonable_reasons.map((reason, index) => (
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
            {row.compliance_rating_reasons?.length && (
              <Box>
                <Typography variant="subtitle1" fontWeight="bold">
                  Compliance Rating Reasons
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap">
                  {row.compliance_rating_reasons.map((reason, index) => (
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
            {row.title_ix_applicable_reasons?.length && (
              <Box>
                <Typography variant="subtitle1" fontWeight="bold">
                  Title IX Reasons
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap">
                  {row.title_ix_applicable_reasons.map((reason, index) => (
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
            {row.severity_reason?.length && (
              <Box>
                <Typography variant="subtitle1" fontWeight="bold">
                  Severity Reasons
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap">
                  {row.severity_reason.map((reason, index) => (
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
                  Chapt 13 Reasons
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap">
                  {row.compliance_chapter_13_reasons.map((reason, index) => (
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
          </Stack>
        </AccordionDetails>
      </Accordion>
    </>
  );
};

export const CallToActionPanel = ({ row }: { row: CallToActionDetails }) => {
  console.log('in cta panel', row);

  return (
    <div>
      <EmailMasterPanel title="Call to Action Details" row={row}>
        <CallToActionPanelContent row={row} />
      </EmailMasterPanel>
    </div>
  );
};
