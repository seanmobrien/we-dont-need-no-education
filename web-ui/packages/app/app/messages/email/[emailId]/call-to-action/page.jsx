import Box from '@mui/material/Box';
import CtaGrid from './grid';
import { EmailDashboardLayout } from '@/components/email-message/dashboard-layout';
import { auth } from '@/auth';
import { ChatPanel, ChatPanelLayout } from '@/components/ai/chat-panel';
import { extractParams } from '@/lib/nextjs-util/server/utils';
import { resolveEmailIdWithRedirect } from '@/lib/email/email-id-resolver';
import { notFound } from 'next/navigation';
export const generateMetadata = async () => {
    return {
        title: 'Call to Action',
    };
};
const Page = async (args) => {
    const { emailId: emailIdParam } = await extractParams(args);
    const normalEmailId = await resolveEmailIdWithRedirect(emailIdParam, '/messages/email/[emailId]/call-to-action');
    if (!normalEmailId) {
        notFound();
    }
    const session = await auth();
    return (<EmailDashboardLayout session={session}>
      <ChatPanelLayout>
        <Box sx={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            '& > :not(style)': {
                m: 1,
            },
        }}>
          <CtaGrid />
          <Box sx={{ flexGrow: 1, minHeight: 0 }}>
            <ChatPanel page="email-cta"/>
          </Box>
        </Box>
      </ChatPanelLayout>
    </EmailDashboardLayout>);
};
export default Page;
//# sourceMappingURL=page.jsx.map