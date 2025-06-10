import { EmailMasterPanel } from '@/components/mui/data-grid';
import { EmailProperty } from '@/data-models/api';

export const EmailHeaderPanel = ({ row }: { row: EmailProperty }) => {
  return <EmailMasterPanel title="Email Header" row={row} />;
};