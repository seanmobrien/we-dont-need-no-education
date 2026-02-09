import React from 'react';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Divider from '@mui/material/Divider';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import LinearProgress from '@mui/material/LinearProgress';
import Rating from '@mui/material/Rating';
import Stack from '@mui/material/Stack';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { KeyPointsDetails } from '@/data-models/api';
import { EmailMasterPanel } from '@/components/mui/data-grid';

const formatScore = (value: number | null): string => {
  if (value === null || value === undefined) return 'N/A';
  return value.toFixed(2);
};

const getScoreColor = (
  score: number | null,
): 'success' | 'warning' | 'error' | 'primary' => {
  if (score === null || score === undefined) return 'primary';
  if (score >= 0.8) return 'success';
  if (score >= 0.5) return 'warning';
  return 'error';
};

const KeyPointsPanelContent = ({
  keyPoint,
}: {
  keyPoint: KeyPointsDetails;
}) => {
  return (
    <>
      {/* Status Indicators */}
      <Box>
        <Typography variant="h6" gutterBottom>
          Status
        </Typography>
        <Stack direction="row" spacing={1} flexWrap="wrap">
          <Chip
            label={keyPoint.inferred ? 'Inferred' : 'Direct'}
            color={keyPoint.inferred ? 'secondary' : 'primary'}
            size="small"
          />
        </Stack>
      </Box>

      <Divider />

      {/* Scores */}
      <Typography variant="h6" gutterBottom>
        Assessment Scores
      </Typography>

      <Grid container spacing={3}>
        {/* Relevance Score */}
        <Grid gridColumn={{ xs: 12, md: 4 }}>
          <Box>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
              Relevance Score
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <Typography variant="h6" sx={{ minWidth: 60 }}>
                {formatScore(keyPoint.relevance)}
              </Typography>
              <Rating
                value={(keyPoint.relevance || 0) * 5} // Assuming scores are 0-1, convert to 5-star
                readOnly
                precision={0.1}
                sx={{ ml: 2 }}
              />
            </Box>
            <LinearProgress
              variant="determinate"
              value={(keyPoint.relevance || 0) * 100}
              color={getScoreColor(keyPoint.relevance)}
              sx={{ height: 8, borderRadius: 1 }}
            />
          </Box>
        </Grid>

        {/* Compliance Score */}
        <Grid gridColumn={{ xs: 12, md: 4 }}>
          <Box>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
              Compliance Score
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <Typography variant="h6" sx={{ minWidth: 60 }}>
                {formatScore(keyPoint.compliance)}
              </Typography>
              <Rating
                value={(keyPoint.compliance || 0) * 5} // Assuming scores are 0-1, convert to 5-star
                readOnly
                precision={0.1}
                sx={{ ml: 2 }}
              />
            </Box>
            <LinearProgress
              variant="determinate"
              value={(keyPoint.compliance || 0) * 100}
              color={getScoreColor(keyPoint.compliance)}
              sx={{ height: 8, borderRadius: 1 }}
            />
          </Box>
        </Grid>

        {/* Severity Score */}
        <Grid gridColumn={{ xs: 12, md: 4 }}>
          <Box>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
              Severity Score
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <Typography variant="h6" sx={{ minWidth: 60 }}>
                {formatScore(keyPoint.severity)}
              </Typography>
              <Rating
                value={(keyPoint.severity || 0) * 5} // Assuming scores are 0-1, convert to 5-star
                readOnly
                precision={0.1}
                sx={{ ml: 2 }}
              />
            </Box>
            <LinearProgress
              variant="determinate"
              value={(keyPoint.severity || 0) * 100}
              color={getScoreColor(keyPoint.severity)}
              sx={{ height: 8, borderRadius: 1 }}
            />
          </Box>
        </Grid>
      </Grid>

      <Divider />

      {/* Expandable Metadata Section */}
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">Additional Metadata</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Stack spacing={2}>
            <Grid container spacing={2}>
              <Grid gridColumn={{ xs: 12, md: 6 }}>
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                  Created On
                </Typography>
                <Typography variant="body2">
                  {keyPoint.createdOn
                    ? new Intl.DateTimeFormat('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      }).format(new Date(keyPoint.createdOn))
                    : 'Not specified'}
                </Typography>
              </Grid>
              <Grid gridColumn={{ xs: 12, md: 6 }}>
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                  Property ID
                </Typography>
                <Typography
                  variant="body2"
                  sx={{ fontFamily: 'monospace', fontSize: '0.875rem' }}
                >
                  {keyPoint.propertyId}
                </Typography>
              </Grid>
            </Grid>
          </Stack>
        </AccordionDetails>
      </Accordion>
    </>
  );
};

export const KeyPointsPanel = ({
  row: keyPoint,
}: {
  row: KeyPointsDetails;
}) => {
  return (
    <EmailMasterPanel title="Key Point" row={keyPoint}>
      <KeyPointsPanelContent keyPoint={keyPoint} />
    </EmailMasterPanel>
  );
};
