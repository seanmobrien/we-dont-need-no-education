import EmailForm from '@/components/email-message/form';
import { extractParams } from '@/lib/nextjs-util';
import { Box } from '@mui/material';

const Home = async (pageProps: { params: Promise<{ emailId: string }> }) => {
  const { emailId } = await extractParams(pageProps);
  return (
    <Box
      sx={{
        width: '100%',
        '& > :not(style)': {
          m: 1,
        },
      }}
    >
      <EmailForm
        emailId={emailId}
        withButtons={true}
        afterSaveBehavior="redirect"
      />
    </Box>
  );
};

export default Home;
