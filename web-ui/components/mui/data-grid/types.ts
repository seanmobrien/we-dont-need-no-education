import { GridColDef } from '@mui/x-data-grid';

export type ServerBoundGridProps = {
  columns: GridColDef[];
  url: string;
  getRecordData?: (url: string) => Promise<Response>;
  idColumn: string;
};

export type EmailPropertyGridProps = Omit<
  ServerBoundGridProps,
  'url' | 'idColumn'
> & {
  property: string;
};
