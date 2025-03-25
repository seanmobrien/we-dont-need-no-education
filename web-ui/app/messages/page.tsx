import * as React from 'react';
import Box from '@mui/material/Box';
import EmailList from '@/components/email-message/list';

export default function Page() {
  return (
    <>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          flexWrap: 'wrap',
          '& > :not(style)': {
            m: 1,
          },
        }}
      >
        <EmailList />
      </Box>
    </>
  );
}
