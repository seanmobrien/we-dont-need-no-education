import * as React from 'react';
import clsx from 'clsx';
import {
  GridRenderCellParams,
  GridTreeNodeWithRender,
  GridValidRowModel,
} from '@mui/x-data-grid-pro';
import Center from '../render-helpers/center';
import Element from './element';
import Value from './value';
import Bar from './bar';

interface ProgressBarProps {
  value: number;
  min?: number;
  max?: number;
}

const ProgressBar = React.memo(function ProgressBar(props: ProgressBarProps) {
  const { value } = props;
  const rawValueInPercent = value * 100;
  const valueInPercent = Math.abs(rawValueInPercent);

  const classes = clsx({
    low: valueInPercent < 30,
    medium: valueInPercent >= 30 && valueInPercent <= 70,
    high: valueInPercent > 70,
  });
  const style = { maxWidth: `${valueInPercent}%` };

  return (
    <Element>
      <Value>{`${rawValueInPercent.toLocaleString()} %`}</Value>
      <Bar className={classes} style={style} negative={value < 0} />
    </Element>
  );
});

const Progress = <
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  R extends GridValidRowModel = any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  N extends GridTreeNodeWithRender = any,
>(
  params: GridRenderCellParams<R, number, N>,
): React.JSX.Element | '' => {
  if (params.value == null) {
    return '';
  }

  return (
    <Center>
      <ProgressBar value={params.value} />
    </Center>
  );
};

export default Progress;
