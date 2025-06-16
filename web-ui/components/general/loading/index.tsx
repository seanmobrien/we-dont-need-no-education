import {
  Card,
  CardContent,
  LinearProgress,
  Box,
  Typography,
} from '@mui/material';

const Loading = ({
  loading,
  errorMessage,
  loadingMessage,
}: {
  loading?: boolean;
  loadingMessage?: string;
  errorMessage?: string | null;
}) => {
  if (loading) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            {loadingMessage ?? 'Loading...'}
          </Typography>
          <LinearProgress />
        </CardContent>
      </Card>
    );
  }
  if (errorMessage) {
    return (
      <Box sx={{ color: 'red', marginBottom: 2, textAlign: 'center' }}>
        <Typography variant="body2" color="error">
          <strong>Error:</strong> {errorMessage}
        </Typography>
      </Box>
    );
  }
  return <></>;
};
export default Loading;
