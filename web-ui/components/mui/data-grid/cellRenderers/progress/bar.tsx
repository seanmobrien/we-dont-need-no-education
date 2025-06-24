import { styled } from '@mui/material/styles';
import { PropsWithChildren, HTMLAttributes } from 'react';

const Bar = ({
  children,
  className,
  style,
  negative = false,
}: PropsWithChildren<
  { negative?: boolean } & HTMLAttributes<HTMLDivElement>
>) => {
  const Wrapper = styled('div')(({ theme }) => {
    const standardColors = {
      low: theme.palette.mode === 'dark' ? '#F4A6A6' : '#f5a9b8',
      medium:
        theme.palette.mode === 'dark' ? '#efbb5aa3' : 'rgba(26, 187, 249, 0.7)',
      high:
        theme.palette.mode === 'dark'
          ? '#088208a3'
          : 'rgba(255, 121, 249, 0.7)',
    };

    const negativeColors = {
      low:
        theme.palette.mode === 'dark' ? '#E15656' : 'rgba(245, 169, 184, 0.8)',
      medium:
        theme.palette.mode === 'dark' ? '#C22727' : 'rgba(26, 187, 249, 0.8)',
      high:
        theme.palette.mode === 'dark' ? '#9E1A1A' : 'rgba(255, 121, 249, 0.8)',
    };

    const thisColors = negative === true ? negativeColors : standardColors;
    return {
      height: '100%',
      '&.low': {
        backgroundColor: thisColors.low,
      },
      '&.medium': {
        backgroundColor: thisColors.medium,
      },
      '&.high': {
        backgroundColor: thisColors.high,
      },
    };
  });

  return (
    <Wrapper className={className} style={style}>
      {children}
    </Wrapper>
  );
};

export default Bar;
