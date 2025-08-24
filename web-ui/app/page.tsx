'use client';
import EmailList from '@/components/email-message/list';
import { Box, CircularProgress } from '@mui/material';
import { Suspense } from 'react';

// Loading component for better UX
const EmailListSkeleton = () => (
  <Box
    display="flex"
    justifyContent="center"
    alignItems="center"
    minHeight="400px"
  >
    <CircularProgress size={40} />
  </Box>
);

export default function Home() {
  return (
    <Box
      sx={{
        display: 'grid',
        alignItems: 'center',
        justifyItems: 'center',
        minHeight: '100vh',
        padding: { xs: 2, sm: 5 },
        fontFamily: 'var(--font-geist-sans)',
        width: '100%',
        backgroundColor: 'var(--background)',
        color: 'var(--foreground)',
      }}
    >
      <Box
        component="main"
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          width: '100%',
        }}
      >
        <Suspense fallback={<EmailListSkeleton />}>
          <EmailList />
        </Suspense>
      </Box>
    </Box>
  );
}
