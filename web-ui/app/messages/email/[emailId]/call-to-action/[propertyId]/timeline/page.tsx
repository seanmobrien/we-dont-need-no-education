import { auth } from '@/auth';
import { EmailDashboardLayout } from '@/components/email-message/dashboard-layout';
import { TimelineAgentInterface } from '@/components/ai/timeline-agent';
import { Box } from '@mui/system';

interface PageProps {
  params: {
    emailId: string;
    propertyId: string;
  };
}

const Page = async ({ params }: PageProps) => {
  const session = await auth();
  const { emailId, propertyId } = await params;

  return (
    <EmailDashboardLayout session={session}>
      <Box
        sx={{
          width: '100%',
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          '& > :not(style)': {
            m: 1,
          },
        }}
      >
        <TimelineAgentInterface
          initialDocumentId={emailId}
          caseId={propertyId}
        />
      </Box>
    </EmailDashboardLayout>
  );
};

export default Page;
