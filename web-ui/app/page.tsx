import EmailList from '@/components/email-message/list';
import { Box } from '@mui/material';

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
        <EmailList />
      </Box>
    </Box>
  );
}
