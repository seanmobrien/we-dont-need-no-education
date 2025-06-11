import { Card, CardContent, LinearProgress, Box, Typography } from '@mui/material';

const Component = ({
  loading,
  errorMessage,
}: {
  loading: boolean;
  errorMessage: string | null;
}) => {
  if (loading) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Loading...
          </Typography>
          <LinearProgress />
        </CardContent>
      </Card>
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
