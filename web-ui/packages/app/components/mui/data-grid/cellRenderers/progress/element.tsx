import { styled } from '@mui/material/styles';
import { PropsWithChildren } from 'react';

const Element = (props: PropsWithChildren) => {
  const Wrapper = styled('div')(({ theme }) => ({
    border: `1px solid ${(theme.vars || theme).palette.divider}`,
    position: 'relative',
    overflow: 'hidden',
    width: '100%',
    height: 26,
    borderRadius: 2,
  }));

  return <Wrapper>{props?.children ?? <></>}</Wrapper>;
};

export default Element;
