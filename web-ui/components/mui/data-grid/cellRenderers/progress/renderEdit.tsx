import * as React from 'react';
import clsx from 'clsx';
import {
  GridRenderEditCellParams,
  GridValidRowModel,
  useGridApiContext,
} from '@mui/x-data-grid-pro';
import { alpha, styled } from '@mui/material/styles';
import Slider, { sliderClasses, SliderProps } from '@mui/material/Slider';
import { debounce } from '@mui/material/utils';
import ValueLabelComponent from './value-label-component';

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
    () => debounce(updateCellEditProps, 150),
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const renderEditProgress = <R extends GridValidRowModel = any>(
  params: GridRenderEditCellParams<R, number>,
) => {
  return <EditProgress {...params} />;
};
