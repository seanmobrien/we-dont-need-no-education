import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TableCell from "@mui/material/TableCell";
import Checkbox from "@mui/material/Checkbox";
const EnhancedTableHead = ({ headCells, ...props }) => {
    const { onSelectAllClick, numSelected, rowCount } = props;
    return (<TableHead>
      <TableRow>
        {onSelectAllClick && (<TableCell padding="checkbox">
            <Checkbox color="primary" indeterminate={numSelected > 0 && numSelected < rowCount} checked={rowCount > 0 && numSelected === rowCount} onChange={onSelectAllClick} inputProps={{
                'aria-label': 'select all emails',
            }}/>
          </TableCell>)}
        {headCells.map((headCell) => (<TableCell key={headCell.id} align={headCell.numeric ? 'right' : 'left'} vertical-align={'center'} sx={{ maxWidth: headCell.maxWidth }} sortDirection={false} padding={headCell.disablePadding ? 'none' : 'normal'}>
            {headCell.label}
          </TableCell>))}
      </TableRow>
    </TableHead>);
};
export default EnhancedTableHead;
//# sourceMappingURL=enhanced-table-head.jsx.map