import { EmailMessageSummary } from '@/data-models';
import { GetGridRecordDataProps } from '@/lib/components/mui/data-grid';
import {
  DataGridProProps,
  GridColDef,
  GridValidRowModel,
} from '@mui/x-data-grid-pro';

export type ServerBoundDataGridProps<
  TRowModel extends GridValidRowModel = GridValidRowModel,
> = {
  columns: GridColDef<TRowModel>[];
  url: string | URL;
  getRecordData?: (props: GetGridRecordDataProps) => Promise<Response>;
  idColumn: string;
} & Omit<
  DataGridProProps<TRowModel>,
  | 'dataSource'
  | 'loading'
  | 'onDataSourceError'
  // | 'columns'
  | 'getRowId'
  | 'pageSizeOptions'
  | 'logger'
  | 'logLevel'
  | 'rows'
  | 'processRowUpdate'
>;

export type EmailPropertyGridProps<
  TRowModel extends GridValidRowModel = GridValidRowModel,
> = Omit<ServerBoundDataGridProps<TRowModel>, 'url' | 'idColumn'> & {
  maxHeight?: string;
  property: string;
};

export type EmailGridProps = Omit<
  ServerBoundDataGridProps<EmailMessageSummary>,
  'url' | 'idColumn' | 'columns'
> & {
  maxHeight?: string;
};
