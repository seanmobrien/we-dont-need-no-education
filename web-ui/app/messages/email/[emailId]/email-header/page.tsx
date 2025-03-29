import { EmailHeaderGrid } from '@/components/email-message/email-header/grid';
import { extractParams } from '@/lib/nextjs-util';
import { Box } from '@mui/material';

const Home = async (pageProps: { params: Promise<{ emailId: string }> }) => {
  const { emailId } = await extractParams(pageProps);
  return (
    <Box
      sx={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        '& > :not(style)': {
          m: 1,
        },
      }}
    >
      <EmailHeaderGrid emailId={emailId} />
    </Box>
  );
};

export default Home;
