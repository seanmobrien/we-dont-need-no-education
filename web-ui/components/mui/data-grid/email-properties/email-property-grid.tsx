'use client';
import { JSX, useCallback, useMemo, useState } from 'react';
import { ServerBoundDataGrid } from '../server-bound-data-grid';
import { EmailPropertyGridProps } from '../types';
import siteBuilder from '@/lib/site-util/url-builder';
import { useParams } from 'next/navigation';
import { Box } from '@mui/material';
import EmailPropertyToolbar from './email-property-toolbar';
import { GridValidRowModel } from '@mui/x-data-grid-pro';

export const EmailPropertyDataGrid = <
  TRowModel extends GridValidRowModel = GridValidRowModel,
>({
  property,
  maxHeight = undefined,
  ...props
}: EmailPropertyGridProps<TRowModel>): JSX.Element => {
  const [includeAttachments, setIncludeAttachments] = useState(true);
  const onSetIncludeAttachments = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>): void => {
      // If the switch is already in the desired state, do nothing
      // This prevents unnecessary state updates and re-renders
      if (includeAttachments === event.target.checked) {
        return; // No change, do nothing
      }
      // Otherwise, update the state to match the switch's state
      setIncludeAttachments(event.target.checked);
    },
    [includeAttachments],
  );
  const { emailId } = useParams<{ emailId: string }>();
  const url = siteBuilder.api.email
    .properties(emailId)
    .page(property, { attachments: includeAttachments })
    .toString();
  const containerSx = useMemo(
    () => ({
      maxHeight,
    }),
    [maxHeight],
  );

  const Toolbar = () => {
    return (
      <EmailPropertyToolbar
        includeAttachments={includeAttachments}
        setIncludeAttachments={onSetIncludeAttachments}
      />
    );
  };

  return (
    <Box
      className="flex flex-col max-w-full"
      sx={containerSx}
    >
      <ServerBoundDataGrid<TRowModel>
        {...props}
        url={url}
        idColumn="propertyId"
        slots={{ toolbar: Toolbar }}
        showToolbar
      />
    </Box>
  );
};
