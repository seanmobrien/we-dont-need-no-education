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
import { Box } from '@mui/material';

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

const SeverityBox = React.memo(function ProgressBar(props: ProgressBarProps) {
  const { value } = props;
  const rawValueInPercent = value * 10;
  const valueInPercent = Math.abs(rawValueInPercent);
  let cbChar;
  if (value < 2) {
    cbChar = '☀️';
  } else if (value <= 4) {
    cbChar = '☁️';
  } else if (value <= 6) {
    cbChar = '⚠️';
  } else if (value <= 8) {
    cbChar = '🔥';
  } else if (value <= 9) {
    cbChar = '🐉';
  } else {
    cbChar = '💀';
  }
  const classes = clsx({
    'w-full': true,
    low: value < 3,
    medium: value >= 3 && value <= 5,
    fire: value > 6 && value <= 8,
    dragon: value > 8 && value <= 9,
    death: value > 9,
  });
  return (
    <Tooltip title={`${valueInPercent.toLocaleString()} %`} enterTouchDelay={0}>
      <Box className={classes}>{cbChar}</Box>
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
      backgroundColor: theme.palette.mode === 'dark' ? '#f44336' : '#f5a9b8', // Use light theme accent
    },
    '&.medium': {
      backgroundColor:
        theme.palette.mode === 'dark' ? '#efbb5aa3' : 'rgba(26, 187, 249, 0.7)', // Use light theme primary
    },
    '&.high': {
      backgroundColor:
        theme.palette.mode === 'dark'
          ? '#088208a3'
          : 'rgba(255, 121, 249, 0.7)', // Use light theme secondary
    },
  },
  [`& .${sliderClasses.thumb}`]: {
    height: '100%',
    width: 5,
    borderRadius: 0,
    marginTop: 0,
    backgroundColor:
      theme.palette.mode === 'dark'
        ? alpha('#000000', 0.2)
        : alpha('#1abbf9', 0.3),
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

const Severity = <
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
      <SeverityBox value={params.value} />
    </Center>
  );
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const renderEditProgress = <R extends GridValidRowModel = any>(
  params: GridRenderEditCellParams<R, number>,
) => {
  return <EditSeverity {...params} />;
};

export default Severity;
