import React from 'react';
import {
  Typography,
  Box,
  Grid,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Stack,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { EmailProperty } from '/data-models/api';
import { EmailMasterPanel } from '/components/mui/data-grid';

const EmailHeaderPanelContent = ({ row }: { row: EmailProperty }) => {
  return (
    <>
      {/* Header Information */}
      <Grid container spacing={2}>
        <Grid gridColumn={{ xs: 12, md: 6 }}>
          <Typography variant="subtitle1" fontWeight="bold">
            Header Name
          </Typography>
          <Typography variant="body2">
            {row.typeName || 'Unknown Header'}
          </Typography>
        </Grid>
        <Grid gridColumn={{ xs: 12, md: 6 }}>
          <Typography variant="subtitle1" fontWeight="bold">
            Category
          </Typography>
          <Typography variant="body2">
            {row.categoryName || 'Email Header'}
          </Typography>
        </Grid>
      </Grid>

      <Divider />

      {/* Basic Information */}
      <Grid container spacing={2}>
        <Grid gridColumn={{ xs: 12 }}>
          <Typography variant="subtitle1" fontWeight="bold">
            Created On
          </Typography>
          <Typography variant="body2">
            {row.createdOn
              ? new Intl.DateTimeFormat('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                }).format(new Date(row.createdOn))
              : 'Not specified'}
          </Typography>
        </Grid>
      </Grid>

      {/* Header Interpretation (if applicable) */}
      {(row.typeName === 'From' ||
        row.typeName === 'To' ||
        row.typeName === 'Cc') && (
        <Box>
          <Typography variant="h6" gutterBottom>
            Email Address Information
          </Typography>
          <Typography variant="body2" color="textSecondary">
            This header contains email address information for the{' '}
            {row.typeName?.toLowerCase()} field. Email addresses may include
            display names and can contain multiple recipients separated by
            commas.
          </Typography>
        </Box>
      )}

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
                  Property ID
                </Typography>
                <Typography
                  variant="body2"
                  sx={{ fontFamily: 'monospace', fontSize: '0.875rem' }}
                >
                  {row.propertyId}
                </Typography>
              </Grid>
              <Grid gridColumn={{ xs: 12, md: 6 }}>
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                  Document ID
                </Typography>
                <Typography variant="body2">{row.documentId}</Typography>
              </Grid>
            </Grid>
          </Stack>
        </AccordionDetails>
      </Accordion>
    </>
  );
};

export const EmailHeaderPanel = ({ row }: { row: EmailProperty }) => {
  return (
    <EmailMasterPanel title="Header Details" row={row}>
      <EmailHeaderPanelContent row={row} />
    </EmailMasterPanel>
  );
};
