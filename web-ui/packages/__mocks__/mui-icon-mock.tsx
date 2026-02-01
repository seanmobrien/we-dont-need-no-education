import * as React from 'react';

export const MockIcon = (props: any) => {
  return (
    <div>
      <span>Mock Icon: {props?.['data-icon']}</span>
      <svg data-testid='mui-icon' data-icon={props?.['data-icon']} 
        {...props} />
    </div>
  );
}
