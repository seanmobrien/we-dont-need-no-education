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
  AccordionDetails
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { EmailProperty } from '@/data-models/api';

export const EmailHeaderPanel = ({ row }: { row: EmailProperty }) => {
  return (
    <Stack sx={{ py: 2, height: '100%', boxSizing: 'border-box' }} direction="column">
      <Paper sx={{ flex: 1, mx: 'auto', width: '95%', p: 2 }}>
        <Stack direction="column" spacing={2}>
          {/* Header */}
          <Typography variant="h5" component="h2" gutterBottom>
            Email Header Details
          </Typography>
          
          {/* Header Information */}
          <Grid container spacing={2}>
            <Grid item xs={12} md={3}>
              <Typography variant="subtitle1" fontWeight="bold">Header Name</Typography>
              <Typography variant="body2">{row.typeName || 'Unknown Header'}</Typography>
            </Grid>
            <Grid item xs={12} md={9}>
              <Typography variant="subtitle1" fontWeight="bold">Header Value</Typography>
              <Typography 
                variant="body1" 
                sx={{ 
                  backgroundColor: 'grey.100', 
                  p: 2, 
                  borderRadius: 1, 
                  fontFamily: 'monospace',
                  fontSize: '0.875rem',
                  wordBreak: 'break-all'
                }}
              >
                {row.value}
              </Typography>
            </Grid>
          </Grid>

          <Divider />

          {/* Basic Information */}
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle1" fontWeight="bold">Created On</Typography>
              <Typography variant="body2">
                {row.createdOn ? new Intl.DateTimeFormat('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                }).format(new Date(row.createdOn)) : 'Not specified'}
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle1" fontWeight="bold">Category</Typography>
              <Typography variant="body2">{row.categoryName || 'Email Header'}</Typography>
            </Grid>
          </Grid>

          {/* Header Interpretation (if applicable) */}
          {(row.typeName === 'From' || row.typeName === 'To' || row.typeName === 'Cc') && (
            <Box>
              <Typography variant="h6" gutterBottom>Email Address Information</Typography>
              <Typography variant="body2" color="textSecondary">
                This header contains email address information for the {row.typeName?.toLowerCase()} field.
                Email addresses may include display names and can contain multiple recipients separated by commas.
              </Typography>
            </Box>
          )}

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
                      Property ID
                    </Typography>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>
                      {row.propertyId}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                      Document ID
                    </Typography>
                    <Typography variant="body2">
                      {row.documentId}
                    </Typography>
                  </Grid>
                </Grid>

                <Box>
                  <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                    Policy Basis
                  </Typography>
                  {row.policy_basis?.length ? (
                    <Stack direction="row" spacing={1} flexWrap="wrap">
                      {row.policy_basis.map((item, index) => (
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
                  {row.tags?.length ? (
                    <Stack direction="row" spacing={1} flexWrap="wrap">
                      {row.tags.map((item, index) => (
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