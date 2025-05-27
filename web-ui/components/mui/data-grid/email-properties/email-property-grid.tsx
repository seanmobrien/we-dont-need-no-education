'use client';
import { JSX, useMemo, useState } from 'react';
import { ServerBoundDataGrid } from '../server-bound-data-grid';
import { EmailPropertyGridProps } from '../types';
import siteBuilder from '@/lib/site-util/url-builder';
import { useParams } from 'next/navigation';
import classnames, {
  display,
  flexDirection,
  maxWidth,
} from '@/tailwindcss.classnames';
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
        setIncludeAttachments={setIncludeAttachments}
      />
    );
  };

  return (
    <Box
      className={classnames(
        display('flex'),
        flexDirection('flex-col'),
        maxWidth('max-w-full'),
      )}
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
