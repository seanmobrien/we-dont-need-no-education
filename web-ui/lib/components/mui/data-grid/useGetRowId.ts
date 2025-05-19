import type {
  GridRowId,
  GridRowIdGetter,
  GridRowModel,
  GridValidRowModel,
} from '@mui/x-data-grid';
import { useCallback } from 'react';

export const useGetRowId = (
  field: string,
): GridRowIdGetter<GridValidRowModel> =>
  useCallback(
    (row: GridRowModel): GridRowId => {
      const rowId = row?.[field] as string;
      if (!rowId) {
        throw new Error(`Row is missing required field: ${field}`);
      }
      return rowId as GridRowId;
    },
    [field],
  ) as GridRowIdGetter<GridValidRowModel>;
