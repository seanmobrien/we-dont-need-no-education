import { EmailMessage } from '@/data-models/api/email-message';
import { PickField } from '@repo/lib-typescript';
import { UseSuspenseQueryResult } from '@tanstack/react-query';

export interface EmailViewerProps {
  emailId: string;
}

export interface EmailAttachment {
  unitId: number;
  attachmentId: number | null;
  fileName?: string;
  hrefDocument?: string;
  hrefApi?: string;
}

type UseEmailApiPropNameMap<TQuery extends TQueryType> = PickField<
  {
    'email-message': 'email';
    'email-attachment-list': 'attachments';
  },
  TQuery
>;

export type TQueryType = 'email-message' | 'email-attachment-list';

export type TResponseMap<TQuery extends TQueryType> = Pick<
  {
    [K in TQuery]: {
      'email-message': EmailMessage;
      'email-attachment-list': EmailAttachment[];
    }[K];
  },
  TQuery
>[TQuery];

export type UseEmailApiQueryResult<TQuery extends TQueryType> = Omit<
  UseSuspenseQueryResult<TResponseMap<TQuery>, Error>,
  'data'
> & {
  [K in TQuery as UseEmailApiPropNameMap<K>]: TResponseMap<K> | undefined;
};
