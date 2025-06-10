import React from 'react';
import { 
  Stack, 
  Paper, 
  Typography, 
  Chip, 
  Box, 
  Grid,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  LinearProgress,
  Rating
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { KeyPointsDetails } from '@/data-models/api';

const formatScore = (value: number | null): string => {
  if (value === null || value === undefined) return 'N/A';
  return value.toFixed(2);
};

const getScoreColor = (score: number | null): 'success' | 'warning' | 'error' | 'default' => {
  if (score === null || score === undefined) return 'default';
  if (score >= 0.8) return 'success';
  if (score >= 0.5) return 'warning';
  return 'error';
};

export const KeyPointsPanel = ({
  row: keyPoint,
}: {
  row: KeyPointsDetails;
}) => {
  return (
    <Stack sx={{ py: 2, height: '100%', boxSizing: 'border-box' }} direction="column">
      <Paper sx={{ flex: 1, mx: 'auto', width: '95%', p: 2 }}>
        <Stack direction="column" spacing={2}>
          {/* Header */}
          <Typography variant="h5" component="h2" gutterBottom>
            Key Point Details
          </Typography>
          
          {/* Content */}
          <Box>
            <Typography variant="h6" gutterBottom>Key Point Content</Typography>
            <Typography variant="body1" sx={{ backgroundColor: 'grey.100', p: 2, borderRadius: 1 }}>
              {keyPoint.value}
            </Typography>
          </Box>

          {/* Status Indicators */}
          <Box>
            <Typography variant="h6" gutterBottom>Status</Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap">
              <Chip 
                label={keyPoint.inferred ? "Inferred" : "Direct"} 
                color={keyPoint.inferred ? "secondary" : "primary"}
                size="small"
              />
            </Stack>
          </Box>

          <Divider />

          {/* Scores */}
          <Typography variant="h6" gutterBottom>Assessment Scores</Typography>
          
          <Grid container spacing={3}>
            {/* Relevance Score */}
            <Grid item xs={12} md={4}>
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
            <Grid item xs={12} md={4}>
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
            <Grid item xs={12} md={4}>
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
              <Typography variant="h6">Metadata</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Stack spacing={2}>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                      Created On
                    </Typography>
                    <Typography variant="body2">
                      {keyPoint.createdOn ? new Intl.DateTimeFormat('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      }).format(new Date(keyPoint.createdOn)) : 'Not specified'}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                      Property ID
                    </Typography>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>
                      {keyPoint.propertyId}
                    </Typography>
                  </Grid>
                </Grid>

                <Box>
                  <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                    Policy Basis
                  </Typography>
                  {keyPoint.policy_basis?.length ? (
                    <Stack direction="row" spacing={1} flexWrap="wrap">
                      {keyPoint.policy_basis.map((item, index) => (
                        <Chip key={index} label={item} color="primary" variant="outlined" />
                      ))}
                    </Stack>
                  ) : (
                    <Typography variant="body2" color="textSecondary">
                      No policy basis specified
                    </Typography>
                  )}
                </Box>

                <Box>
                  <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                    Tags
                  </Typography>
                  {keyPoint.tags?.length ? (
                    <Stack direction="row" spacing={1} flexWrap="wrap">
                      {keyPoint.tags.map((item, index) => (
                        <Chip key={index} label={item} color="secondary" variant="outlined" />
                      ))}
                    </Stack>
                  ) : (
                    <Typography variant="body2" color="textSecondary">
                      No tags specified
                    </Typography>
                  )}
                </Box>
              </Stack>
            </AccordionDetails>
          </Accordion>
        </Stack>
      </Paper>
    </Stack>
  );
};
