import { createElement } from '@compliance-theater/types/react';

export const MockIcon = (props: any) => {
  const dataIcon = props?.['data-icon'];
  const svgProps = {
    'data-testid': 'mui-icon',
    'data-icon': dataIcon,
    ...props,
  };

  return createElement(
    'div',
    undefined,
    createElement('span', undefined, `Mock Icon: ${dataIcon ?? ''}`),
    createElement('svg', svgProps),
  );
};

export default MockIcon;