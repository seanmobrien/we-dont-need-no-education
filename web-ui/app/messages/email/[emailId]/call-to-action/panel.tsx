import { EmailMasterPanel } from '@/components/mui/data-grid';
import { CallToActionDetails } from '@/data-models/api';

export const CallToActionPanel = ({ row }: { row: CallToActionDetails }) => {
  return <EmailMasterPanel title="Call to Action" row={row} />;
};
