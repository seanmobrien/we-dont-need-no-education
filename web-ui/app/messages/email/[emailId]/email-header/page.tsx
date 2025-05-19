import { auth } from '@/auth';
import { EmailDashboardLayout } from '@/components/email-message/dashboard-layout';
import { EmailPropertyDataGrid } from '@/components/mui/data-grid/email-properties/email-property-grid';
import { Box } from '@mui/material';
import stableColumns from './grid-columns';

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
        <EmailPropertyDataGrid
          property="email-headers"
          columns={stableColumns}
        />
      </Box>
    </EmailDashboardLayout>
  );
};

export default Home;
