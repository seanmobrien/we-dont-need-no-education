import { EmailMasterPanel } from '@/components/mui/data-grid';
import { CallToActionResponseDetails } from '@/data-models/api';

export const ResponsiveActionPanel = ({
  row,
}: {
  row: CallToActionResponseDetails;
}) => {
  return <EmailMasterPanel title="Responsive Action" row={row} />;
};
export default ResponsiveActionPanel;
