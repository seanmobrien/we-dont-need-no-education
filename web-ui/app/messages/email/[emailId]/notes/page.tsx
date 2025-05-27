import { Box } from '@mui/material';
import { NoteGrid } from './grid';
import { EmailDashboardLayout } from '@/components/email-message/dashboard-layout';
import { auth } from '@/auth';

const Home = async () => {
  const session = await auth();

  return (
    <EmailDashboardLayout session={session}>
      <Box
        sx={{
          width: '100%',
          '& > :not(style)': {
            m: 1,
          },
        }}
      >
        <NoteGrid />
      </Box>
    </EmailDashboardLayout>
  );
};

export default Home;
