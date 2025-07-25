import React from 'react';
import {
  Typography,
  Grid,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Stack,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { EmailProperty } from '@/data-models/api';
import { EmailMasterPanel } from '@/components/mui/data-grid';

const NotesPanelContent = ({ row }: { row: EmailProperty }) => {
  return (
    <>
      <Divider />

      {/* Basic Information */}
      <Grid container spacing={2}>
        <Grid gridColumn={{ xs: 12, md: 6 }}>
          <Typography variant="subtitle1" fontWeight="bold">
            Type
          </Typography>
          <Typography variant="body2">{row.typeName || 'Note'}</Typography>
        </Grid>
        <Grid gridColumn={{ xs: 12, md: 6 }}>
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

export const NotesPanel = ({ row }: { row: EmailProperty }) => {
  return (
    <EmailMasterPanel title="Note" row={row}>
      <NotesPanelContent row={row} />
    </EmailMasterPanel>
  );
};
