import { CallToActionDetails } from '@/data-models';
import { Chip } from '@mui/material';
import { GridRenderCellParams } from '@mui/x-data-grid-pro';

export const renderArrayAsChips = (
  params: GridRenderCellParams<CallToActionDetails, string[]>,
) => (
  <>
    {params?.value?.map((item) => (
      <Chip key={item} label={item} style={{ margin: 2 }} size="small" />
    ))}
  </>
);
