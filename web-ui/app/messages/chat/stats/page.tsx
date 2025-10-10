import * as React from 'react';
import Box from '@mui/material/Box';
import { EmailDashboardLayout } from '@/components/email-message/dashboard-layout/email-dashboard-layout';
import { auth } from '@/auth';
import { StatisticsOverview } from '@/components/statistics/statistics-overview';

const StatisticsPage = async () => {
  const session = await auth();

  return (
    <EmailDashboardLayout session={session}>
      <Box
        sx={{
          width: '100%',
          p: 2,
          '& > :not(style)': {
            mb: 2,
          },
        }}
      >
        <StatisticsOverview />
      </Box>
    </EmailDashboardLayout>
  );
};

export default StatisticsPage;
