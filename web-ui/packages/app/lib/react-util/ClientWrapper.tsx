'use client';

import { JSX, PropsWithChildren } from 'react';

export const ClientWrapper = ({
  children,
}: PropsWithChildren<object>): JSX.Element => {
  return <>{children}</>;
};
