import React from 'react';
import { render } from '/__tests__/test-utils';
import EnhancedTableHead from '/components/general/enhanced-table-head';

const mockHeadCells = [
  { id: 'name', label: 'Name', numeric: false, disablePadding: false },
  { id: 'email', label: 'Email', numeric: false, disablePadding: false },
  { id: 'count', label: 'Count', numeric: true, disablePadding: false },
];

describe('EnhancedTableHead', () => {
  const defaultProps = {
    headCells: mockHeadCells,
    numSelected: 0,
    rowCount: 10,
  };

  it('renders table head snapshot', () => {
    const { container } = render(
      <table>
        <EnhancedTableHead {...defaultProps} />
      </table>,
    );
    expect(container).toMatchSnapshot();
  });

  it('renders with some selected items snapshot', () => {
    const { container } = render(
      <table>
        <EnhancedTableHead {...defaultProps} numSelected={2} />
      </table>,
    );
    expect(container).toMatchSnapshot();
  });

  it('renders with all items selected snapshot', () => {
    const { container } = render(
      <table>
        <EnhancedTableHead {...defaultProps} numSelected={10} />
      </table>,
    );
    expect(container).toMatchSnapshot();
  });

  it('renders with select all callback snapshot', () => {
    const { container } = render(
      <table>
        <EnhancedTableHead {...defaultProps} onSelectAllClick={jest.fn()} />
      </table>,
    );
    expect(container).toMatchSnapshot();
  });
});
