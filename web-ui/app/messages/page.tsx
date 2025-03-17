import * as React from 'react';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import EmailList from '@/components/email-message/list';
import { justifyContent } from '@/tailwindcss.classnames';

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
