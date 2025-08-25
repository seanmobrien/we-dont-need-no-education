import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TableCell from "@mui/material/TableCell";
import Checkbox from "@mui/material/Checkbox";

/**
 * Represents a header cell in a table.
 *
 * @property {string} id - The unique identifier for the cell.
 * @property {string} label - The label for the cell.
 * @property {boolean} numeric - Indicates whether the cell contains numeric data.
 * @property {boolean} disablePadding - Indicates whether padding is disabled for the cell.
 */
export interface HeadCell {
  id: string;
  label: string;
  numeric: boolean;
  disablePadding: boolean;
  maxWidth?: string;
}


interface EnhancedTableProps {
  numSelected: number;
  onSelectAllClick?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  rowCount: number;
  headCells: HeadCell[];
}

const EnhancedTableHead: React.FC<EnhancedTableProps> = ({
  headCells,
  ...props
}) => {
  const { onSelectAllClick, numSelected, rowCount } = props;

  return (
    <TableHead>
      <TableRow>
        {onSelectAllClick && (
          <TableCell padding="checkbox">
            <Checkbox
              color="primary"
              indeterminate={numSelected > 0 && numSelected < rowCount}
              checked={rowCount > 0 && numSelected === rowCount}
              onChange={onSelectAllClick}
              inputProps={{
                'aria-label': 'select all emails',
              }}
            />
          </TableCell>
        )}
        {headCells.map((headCell) => (
          <TableCell
            key={headCell.id}
            align={headCell.numeric ? 'right' : 'left'}
            vertical-align={'center'}
            sx={{ maxWidth: headCell.maxWidth }}
            sortDirection={false}
            padding={headCell.disablePadding ? 'none' : 'normal'}
          >
            {headCell.label}
          </TableCell>
        ))}
      </TableRow>
    </TableHead>
  );
};

export default EnhancedTableHead;
