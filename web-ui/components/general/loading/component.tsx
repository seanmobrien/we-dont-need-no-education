import { CircularProgress, Box, Typography } from '@mui/material';

const Component = ({
  loading,
  errorMessage,
}: {
  loading: boolean;
  errorMessage: string | null;
}) => {
  if (loading) {
    return (
      <div>
        <CircularProgress />
      </div>
    );
  }
  if (errorMessage) {
    return (
      <Box sx={{ color: 'red', marginBottom: 2 }}>
        <Typography variant="body2" color="error">
          <strong>Error:</strong> {errorMessage}
        </Typography>
      </Box>
    );
  }
  return <></>;
};
export default Component;
