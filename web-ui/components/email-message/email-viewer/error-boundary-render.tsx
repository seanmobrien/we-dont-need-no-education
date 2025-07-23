import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Box from "@mui/system/Box";

export const renderErrorBoundary = (
  {error, resetErrorBoundary}: {
    error: unknown;
    resetErrorBoundary: (...args: unknown[]) => void;
  }
): React.ReactNode => {
  return (
    <Box>
      <Alert severity="error">{String(error)}</Alert>
      <Button onClick={() => resetErrorBoundary()}>Try again</Button>
    </Box>
  );
};
