import { auth } from '/auth';
import { EmailDashboardLayout } from '/components/email-message/dashboard-layout';
import { TimelineAgentInterface } from '/components/ai/timeline-agent';
import { resolveEmailIdWithRedirect } from '/lib/email/email-id-resolver';
import { Box } from '@mui/system';

interface PageProps {
  params: Promise<{
    emailId: string;
    propertyId: string;
  }>;
}

const Page = async ({ params }: PageProps) => {
  const session = await auth();
  const { emailId: emailIdParam, propertyId } = await params;

  // Resolve email ID and handle redirects for document IDs
  const emailId = await resolveEmailIdWithRedirect(
    emailIdParam,
    `/messages/email/[emailId]/call-to-action/${propertyId}/timeline`,
  );

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
