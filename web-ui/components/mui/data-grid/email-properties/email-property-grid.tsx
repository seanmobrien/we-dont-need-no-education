'use client';
import { JSX } from 'react';
import { ServerBoundDataGrid } from '../server-bound-data-grid';
import { EmailPropertyGridProps } from '../types';
import siteBuilder from '@/lib/site-util/url-builder';
import { useParams } from 'next/navigation';

export const EmailPropertyDataGrid = ({
  property,
  ...props
}: EmailPropertyGridProps): JSX.Element => {
  const { emailId } = useParams<{ emailId: string }>();
  const url = siteBuilder.api.email
    .properties(emailId)
    .page(property)
    .toString();

  return <ServerBoundDataGrid {...props} url={url} idColumn="property_id" />;
};
