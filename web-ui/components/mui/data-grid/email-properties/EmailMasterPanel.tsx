import { EmailProperty } from '/data-models/api/email-properties/property-type';
import { Stack, Paper, Typography, Chip, Box } from '@mui/material';
import { useMemo } from 'react';

const normalDescriptionBody = {
  px: 2,
  py: 1,
  whiteSpace: 'pre-wrap',
};
const styles = {
  footerBox: { p: 2, borderTop: '1px solid grey', marginTop: '1em' },
  heightOne: { height: 1 },
  padBottomHalf: { pb: 0.5 },
  padTags: { mt: '1em', pb: 0.5 },
  paperDescription: {
    borderRadius: 1,
    marginTop: '4px !important',
  },
  page: { flex: 1, mx: 'auto', width: '95%', p: 2 },
  stack: { py: 2, height: '100%', boxSizing: 'border-box' },
  description: {
    normal: normalDescriptionBody,
    emailHeaders: {
      ...normalDescriptionBody,
      fontFamily: 'monospace',
      fontSize: '0.875rem',
      wordBreak: 'break-all',
    },
  },
  marginTwo: { margin: 2 },
} as const;

export const EmailMasterPanel = ({
  row: { value, policy_basis, tags, categoryName, propertyId },
  title,
  children,
}: {
  row: Omit<EmailProperty, 'typeId'>;
  title: string;
  children?: React.ReactNode | React.ReactNode[];
}) => {
  // For email headers, apply special styling to the value
  const isEmailHeader = categoryName === 'Email Header';
  const MemoizedHeader = useMemo(() => {
    return (
      <>
        <Typography variant="h6">
          {title} {`(${propertyId})`}
        </Typography>
        <Paper elevation={2} sx={styles.paperDescription}>
          <Typography
            variant="body1"
            align="left"
            sx={
              isEmailHeader
                ? styles.description.emailHeaders
                : styles.description.normal
            }
          >
            {value}
          </Typography>
        </Paper>
      </>
    );
  }, [title, value, isEmailHeader, propertyId]);

  const policyList = policy_basis?.join('|') ?? '';
  const tagsList = tags?.join('|') ?? '';

  const MemoizedFooter = useMemo(() => {
    return (
      <Box component="section" sx={styles.footerBox}>
        <Typography
          variant="body2"
          color="textSecondary"
          align="left"
          sx={styles.padBottomHalf}
        >
          Policy Basis
        </Typography>
        <Typography variant="body1" align="left" component="div">
          {policyList
            ? policyList
                .split('|')
                .map((item) => (
                  <Chip key={item} label={item} style={styles.marginTwo} />
                ))
            : 'No policy basis specified'}
        </Typography>

        <Typography
          variant="body2"
          color="textSecondary"
          align="left"
          sx={styles.padTags}
        >
          Tags
        </Typography>
        <Typography variant="body1" align="left" component="div">
          {tagsList
            ? tagsList
                .split('|')
                .map((item) => (
                  <Chip key={item} label={item} style={styles.marginTwo} />
                ))
            : 'No tags specified'}
        </Typography>
      </Box>
    );
  }, [policyList, tagsList]);
  return (
    <Stack sx={styles.stack} direction="column">
      <Paper sx={styles.page}>
        <Stack direction="column" spacing={2} sx={styles.heightOne}>
          {MemoizedHeader}
          {children}
          {MemoizedFooter}
        </Stack>
      </Paper>
    </Stack>
  );
};
