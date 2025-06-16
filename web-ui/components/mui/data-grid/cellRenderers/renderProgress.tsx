import * as React from 'react';
import clsx from 'clsx';
import {
  GridRenderCellParams,
  GridRenderEditCellParams,
  GridTreeNodeWithRender,
  GridValidRowModel,
  useGridApiContext,
} from '@mui/x-data-grid-pro';
import { alpha, styled } from '@mui/material/styles';
import Slider, { sliderClasses, SliderProps } from '@mui/material/Slider';
import Tooltip from '@mui/material/Tooltip';
import { debounce } from '@mui/material/utils';

interface ProgressBarProps {
  value: number;
  min?: number;
  max?: number;
}

const Center = styled('div')({
  height: '100%',
  display: 'flex',
  alignItems: 'center',
});

const Element = styled('div')(({ theme }) => ({
  border: `1px solid ${(theme.vars || theme).palette.divider}`,
  position: 'relative',
  overflow: 'hidden',
  width: '100%',
  height: 26,
  borderRadius: 2,
}));

const Value = styled('div')({
  position: 'absolute',
  lineHeight: '24px',
  width: '100%',
  display: 'flex',
  justifyContent: 'center',
});

const Bar = styled('div')(({ theme }) => ({
  height: '100%',
  '&.low': {
    backgroundColor: theme.palette.mode === 'dark' ? '#F4A6A6' : '#f5a9b8', // Use colorful theme accent
  },
  '&.medium': {
    backgroundColor: theme.palette.mode === 'dark' ? '#efbb5aa3' : 'rgba(26, 187, 249, 0.7)', // Use colorful theme primary
  },
  '&.high': {
    backgroundColor: theme.palette.mode === 'dark' ? '#088208a3' : 'rgba(255, 121, 249, 0.7)', // Use colorful theme secondary
  },
}));

const NegativeBar = styled('div')(({ theme }) => ({
  height: '100%',
  '&.low': {
    backgroundColor: theme.palette.mode === 'dark' ? '#E15656' : 'rgba(245, 169, 184, 0.8)',
  },
  '&.medium': {
    backgroundColor: theme.palette.mode === 'dark' ? '#C22727' : 'rgba(26, 187, 249, 0.8)',
  },
  '&.high': {
    backgroundColor: theme.palette.mode === 'dark' ? '#9E1A1A' : 'rgba(255, 121, 249, 0.8)',
  },
}));

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
      {value < 0 ? <NegativeBar className={classes} style={style} /> : null}
      <Bar className={classes} style={style} />
    </Element>
  );
});

const StyledSlider = styled(Slider)(({ theme }) => ({
  display: 'flex',
  height: '100%',
  width: '100%',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 0,
  borderRadius: 0,
  [`& .${sliderClasses.rail}`]: {
    height: '100%',
    backgroundColor: 'transparent',
  },
  [`& .${sliderClasses.track}`]: {
    height: '100%',
    transition: theme.transitions.create('background-color', {
      duration: theme.transitions.duration.shorter,
    }),
    '&.low': {
      backgroundColor: '#f44336',
    },
    '&.medium': {
      backgroundColor: '#efbb5aa3',
    },
    '&.high': {
      backgroundColor: '#088208a3',
    },
  },
  [`& .${sliderClasses.thumb}`]: {
    height: '100%',
    width: 5,
    borderRadius: 0,
    marginTop: 0,
    backgroundColor: alpha('#000000', 0.2),
  },
}));

const ValueLabelComponent = React.memo(function ValueLabelComponent({
  children,
  open,
  value,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  children: React.ReactElement<unknown, any>;
  open: boolean;
  value: number;
}) {
  return (
    <Tooltip open={open} enterTouchDelay={0} placement="top" title={value}>
      {children}
    </Tooltip>
  );
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const EditProgress = <R extends GridValidRowModel = any>(
  props: GridRenderEditCellParams<R, number>,
) => {
  const { id, value, field } = props;
  const [valueState, setValueState] = React.useState(Number(value));

  const apiRef = useGridApiContext();

  const updateCellEditProps = React.useCallback(
    (newValue: number) => {
      apiRef.current.setEditCellValue({ id, field, value: newValue });
    },
    [apiRef, field, id],
  );

  const debouncedUpdateCellEditProps = React.useMemo(
    () => debounce(updateCellEditProps, 60),
    [updateCellEditProps],
  );

  const handleChange = (event: Event, newValue: number | number[]) => {
    setValueState(newValue as number);
    debouncedUpdateCellEditProps(newValue as number);
  };

  React.useEffect(() => {
    setValueState(Number(value));
  }, [value]);

  const handleRef: SliderProps['ref'] = (element) => {
    if (element) {
      element.querySelector<HTMLElement>('[type="range"]')!.focus();
    }
  };

  return (
    <StyledSlider
      ref={handleRef}
      classes={{
        track: clsx({
          low: valueState < 0.3,
          medium: valueState >= 0.3 && valueState <= 0.7,
          high: valueState > 0.7,
        }),
      }}
      value={valueState}
      max={1}
      step={0.00001}
      onChange={handleChange}
      components={{ ValueLabel: ValueLabelComponent }}
      valueLabelDisplay="auto"
      valueLabelFormat={(newValue) => `${(newValue * 100).toLocaleString()} %`}
    />
  );
};

export const renderProgress = <
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const renderEditProgress = <R extends GridValidRowModel = any>(
  params: GridRenderEditCellParams<R, number>,
) => {
  return <EditProgress {...params} />;
};
