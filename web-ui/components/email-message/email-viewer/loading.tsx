import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import LinearProgress from "@mui/material/LinearProgress";
import Typography from "@mui/material/Typography";

export const Loading = ({ text }: { text: string }) => {
  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          {text}
        </Typography>
        <LinearProgress />
      </CardContent>
    </Card>
  );
};

export const LoadingEmail = () => (
<Loading text="Loading Email..." />
);

export const LoadingAttachments = () => (
  <Loading text="Loading Attachments..." />
);