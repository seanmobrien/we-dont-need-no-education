/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { PropsWithChildren, act } from 'react';
import { render } from '@testing-library/react';
import { ThemeProvider } from '@/lib/themes/provider';

const AllTheProviders = ({ children }: PropsWithChildren) => {
  return <ThemeProvider>{children}</ThemeProvider>;
};

const customRender = (ui: any, options: any = {}) =>
  render(ui, { wrapper: AllTheProviders, ...options });

// re-export everything
export * from '@testing-library/react';

// override render method
export { customRender as render };
