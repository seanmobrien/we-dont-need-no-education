import { EmailMessage } from '@/data-models/api';
import { getEmail } from '@/lib/api/email/client';
import { LoggedError } from '@/lib/react-util/errors/logged-error';
import { useSuspenseQuery } from '@tanstack/react-query';
import { UseEmailApiQueryResult, TResponseMap, EmailAttachment } from './types';
import { fetch } from '@/lib/nextjs-util/fetch';

export const emailMessageQuery = async ({
  queryKey,
}: {
  queryKey: ['email-message', string];
}) => {
  if (queryKey.length < 2) {
    throw new Error('Invalid query key for emailMessageQuery');
  }
  if (queryKey[0] !== 'email-message') {
    throw new Error(`Invalid query key type: ${queryKey[0]}`);
  }
  const emailId = queryKey[1];
  try {
    const email = await getEmail(emailId);
    if (!email) {
      throw new Error('Email not found');
    }
    return email;
  } catch (error) {
    const le = LoggedError.isTurtlesAllTheWayDownBaby(error, {
      log: true,
      message: 'Error fetching email details',
      emailId,
      source: 'EmailViewer: emailMessageQuery',
    });
    throw le;
  }
};

export const emailApiQuery = async <
  TQuery extends 'email-message' | 'email-attachment-list',
>({
  queryKey,
}: {
  queryKey: [TQuery, string];
}): Promise<TResponseMap<TQuery>> => {
  if (queryKey.length < 2) {
    throw new Error('Invalid query key for emailAttachmentsQuery', {
      cause: { data: queryKey, name: 'InputInvalidError' },
    });
  }
  const emailId = queryKey[1];
  let description: string;
  let url: string;
  switch (queryKey[0]) {
    case 'email-attachment-list':
      description = 'Email attachments';
      url = `/api/email/${emailId}/attachments`;
      break;
    case 'email-message':
      description = 'Email message';
      url = `/api/email/${emailId}`;
      break;
    default:
      throw new Error(`Invalid query key type: ${queryKey[0]}`, {
        cause: { data: queryKey, name: 'InputInvalidError' },
      });
  }

  try {
    // Call the API
    const response = await fetch(url);
    if (!response.ok) {
      if (response.status === 404) {
        // No attachments found, that's okay, not every email has them (I guess?)
        if (queryKey[0] === 'email-attachment-list') {
          return [] as unknown as TResponseMap<TQuery>;
        }
      }
      throw new Error(`Failed to fetch ${description}`, {
        cause: {
          name: 'FetchError',
          status: response.status,
          statusText: response.statusText,
        },
      });
    }
    const data = (await response.json()) as TResponseMap<TQuery>;
    if (
      !data ||
      (queryKey[0] === 'email-attachment-list' && !Array.isArray(data))
    ) {
      throw new Error(`Invalid ${description} data`, {
        cause: { data, name: 'InvalidResponseError' },
      });
    }
    return data;
  } catch (error) {
    const le = LoggedError.isTurtlesAllTheWayDownBaby(error, {
      log: true,
      message: `Error loading ${description} for document [${emailId}]`,
      emailId: queryKey[1],
      source: 'EmailViewer: emailAttachmentsQuery',
    });
    throw le;
  }
};

export const useEmailMessageQuery = ({
  emailId,
}: {
  emailId: string;
}): UseEmailApiQueryResult<'email-message'> => {
  const queryState = useSuspenseQuery({
    queryKey: ['email-message', emailId],
    queryFn: emailApiQuery<'email-message'>,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
  const ret = {
    ...{ ...queryState, data: undefined },
    email: queryState.data as EmailMessage | undefined,
  };
  return ret;
};

export const useEmailAttachmentsQuery = ({
  emailId,
}: {
  emailId: string;
}): UseEmailApiQueryResult<'email-attachment-list'> => {
  const ret = useSuspenseQuery({
    queryKey: ['email-attachment-list', emailId],
    queryFn: emailApiQuery<'email-attachment-list'>,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
  return {
    ...{ ...ret, data: undefined },
    attachments: ret.data as EmailAttachment[] | undefined,
  } as UseEmailApiQueryResult<'email-attachment-list'>;
};
