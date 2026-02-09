import ImportSession from '@/components/email-import/import-session';
import Box from '@mui/material/Box';

const Home = async () => {
  return (
    <Box
      sx={{
        width: '100%',
        '& > :not(style)': {
          m: 1,
        },
      }}
    >
      <ImportSession />
    </Box>
  );
};

export default Home;
