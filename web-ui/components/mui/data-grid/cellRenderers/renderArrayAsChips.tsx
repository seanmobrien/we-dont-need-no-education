import { CallToActionDetails } from '@/data-models';
import { Chip } from '@mui/material';
import { GridRenderCellParams } from '@mui/x-data-grid-pro';
import { useMemo } from 'react';

const Chips = (params: GridRenderCellParams<CallToActionDetails, string[]>) =>
  useMemo(
    () => (
      <>
        {params?.value?.map((item) => (
          <Chip key={item} label={item} style={{ margin: 2 }} size="small" />
        ))}
      </>
    ),
    // By checking the length and contents of the array we can avoid unnecessary re-renders caused by Object.equals array comparison quirks
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [params.value?.length ? params.value.join(',') : null],
  );

export default Chips;
