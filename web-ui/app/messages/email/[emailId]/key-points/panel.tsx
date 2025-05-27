import { EmailMasterPanel } from '@/components/mui/data-grid';
import { KeyPointsDetails } from '@/data-models/api';

export const KeyPointsPanel = ({
  row: keyPoint,
}: {
  row: KeyPointsDetails;
}) => {
  return <EmailMasterPanel title="Key Point" row={keyPoint} />;
};
