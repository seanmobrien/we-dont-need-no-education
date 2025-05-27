import { Box } from '@mui/material';
import CtaGrid from './grid';
import { EmailDashboardLayout } from '@/components/email-message/dashboard-layout';
import { auth } from '@/auth';

const Page = async () => {
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
        <CtaGrid />
      </Box>
    </EmailDashboardLayout>
  );
};

export default Page;
