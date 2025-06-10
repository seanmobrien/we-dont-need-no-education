import { EmailProperty } from '@/data-models';
import { Stack, Paper, Typography, Chip, Box } from '@mui/material';

export const EmailMasterPanel = ({
  row: { value, policy_basis, tags },
  title,
  children,
}: {
  row: Omit<EmailProperty, 'typeId'>;
  title: string;
  children?: React.ReactNode | React.ReactNode[];
}) => {
  return (
    <Stack
      sx={{ py: 2, height: '100%', boxSizing: 'border-box' }}
      direction="column"
    >
      <Paper sx={{ flex: 1, mx: 'auto', width: '95%', p: 2 }}>
        <Stack direction="column" spacing={2} sx={{ height: 1 }}>
          <Typography variant="h6">{title}</Typography>
          <Typography variant="body2" color="textSecondary" align="left">
            Description
          </Typography>
          <Typography variant="body1" align="left" sx={{ backgroundColor: 'grey.100', p: 2, borderRadius: 1, whiteSpace: 'pre-wrap' }}>
            {value}
          </Typography>
          {children}
          <Box
            component="section"
            sx={{ p: 2, borderTop: '1px solid grey', marginTop: '1em' }}
          >
            <Typography
              variant="body2"
              color="textSecondary"
              align="left"
              sx={{ pb: 0.5 }}
            >
              Policy Basis
            </Typography>
            <Typography variant="body1" align="left" component="div">
              {policy_basis?.map((item) => (
                <Chip key={item} label={item} style={{ margin: 2 }} />
              ))}
            </Typography>

            <Typography
              variant="body2"
              color="textSecondary"
              align="left"
              sx={{ mt: '1em', pb: 0.5 }}
            >
              Tags
            </Typography>
            <Typography variant="body1" align="left" component="div">
              {tags?.map((item) => (
                <Chip key={item} label={item} style={{ margin: 2 }} />
              ))}
            </Typography>
          </Box>
        </Stack>
      </Paper>
    </Stack>
  );
};
