import { styled } from '@mui/material/styles';
import { PropsWithChildren } from 'react';

const Center = ({
  children,
  height = 1,
}: PropsWithChildren<{ height?: number }>) => {
  const transformedHeight = height <= 1 ? height * 100 + '%' : height + '%';
  const StyledDiv = styled('div')({
    height: transformedHeight,
    display: 'flex',
    alignItems: 'center',
  });
  return <StyledDiv>{children}</StyledDiv>;
};

export default Center;
