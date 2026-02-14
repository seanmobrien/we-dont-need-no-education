import Box from '@mui/material/Box';
import CtaResponseGrid from './grid';
import { EmailDashboardLayout } from '@/components/email-message/dashboard-layout';
import { auth } from '@/auth';
import { ChatPanel, ChatPanelLayout } from '@/components/ai/chat-panel';
import { extractParams } from '@/lib/nextjs-util/server/utils';
import { resolveEmailIdWithRedirect } from '@/lib/email/email-id-resolver';
export const generateMetadata = async () => {
    return {
        title: 'Responsive Actions',
    };
};
const Home = async (args) => {
    const { emailId: emailIdParam } = await extractParams(args);
    await resolveEmailIdWithRedirect(emailIdParam, '/messages/email/[emailId]/call-to-action-response');
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
          <CtaResponseGrid />
          <Box sx={{ flexGrow: 1, minHeight: 0 }}>
            <ChatPanel page="email-responsive-action"/>
          </Box>
        </Box>
      </ChatPanelLayout>
    </EmailDashboardLayout>);
};
export default Home;
//# sourceMappingURL=page.jsx.map