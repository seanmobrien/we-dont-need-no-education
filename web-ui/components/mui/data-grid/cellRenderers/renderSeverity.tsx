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

const Bar = styled('div')({
  height: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 18,
  position: 'relative',
  width: '100%',
  '&::after': {
    position: 'absolute',
    left: '50%',
    top: '50%',
    transform: 'translate(-50%, -50%)',
  },
  '&.low': {
    '&::after': {
      content: '"☁️"',
    },
  },
  '&.med': {
    '&::after': {
      content: '"⚠️"',
    },
  },
  '&.fire': {
    '&::after': {
      content: '"🔥"',
    },
  },
  '&.dragon': {
    '&::after': {
      content: '"🐉"',
    },
  },
  '&.death': {
    '&::after': {
      content: '"💀"',
    },
  },
});

const ProgressBar = React.memo(function ProgressBar(props: ProgressBarProps) {
  const { value } = props;
  const rawValueInPercent = value * 10;
  const valueInPercent = Math.abs(rawValueInPercent);

  const classes = clsx({
    low: value < 2,
    medium: value >= 2 && value <= 4,
    fire: value > 6 && value <= 8,
    dragon: value > 8 && value <= 9,
    death: value > 9,
  });
  const style = { maxWidth: `${valueInPercent}%` };

  return (
    <Tooltip title={`${valueInPercent.toLocaleString()} %`} enterTouchDelay={0}>
      <Bar className={classes} style={style} />
    </Tooltip>
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
const EditSeverity = <R extends GridValidRowModel = any>(
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
          low: valueState < 20,
          medium: valueState >= 20 && valueState <= 40,
          fire: valueState > 60 && valueState <= 80,
          dragon: valueState > 80 && valueState <= 90,
          death: valueState > 90,
        }),
      }}
      value={valueState}
      max={1}
      step={10}
      onChange={handleChange}
      components={{ ValueLabel: ValueLabelComponent }}
      valueLabelDisplay="auto"
      valueLabelFormat={(newValue) => `${(newValue * 100).toLocaleString()} %`}
    />
  );
};

export const renderSeverity = <
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
  return <EditSeverity {...params} />;
};
