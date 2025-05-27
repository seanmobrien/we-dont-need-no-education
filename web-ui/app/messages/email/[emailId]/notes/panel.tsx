import { EmailMasterPanel } from '@/components/mui/data-grid';
import { EmailProperty } from '@/data-models/api';

export const NotesPanel = ({ row }: { row: EmailProperty }) => {
  return <EmailMasterPanel title="Note" row={row} />;
};
