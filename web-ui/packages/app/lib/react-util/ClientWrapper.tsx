'use client';

import { JSX, PropsWithChildren } from '@compliance-theater/types/react';

export const ClientWrapper = ({
  children,
}: PropsWithChildren<object>): JSX.Element => {
  return <>{children}</>;
};
