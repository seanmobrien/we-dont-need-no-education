import { log } from '@repo/lib-logger';
import { gmail_v1 } from 'googleapis';
import { ArrayElement } from '@repo/lib-typescript';
import { isParsedHeaderMap, ParsedHeaderMap } from '../../parsedHeaderMap';
import { ParsedContact, RecipientType } from '../types';

export const mapContacts = (
  headers: gmail_v1.Schema$MessagePart['headers'] | ParsedHeaderMap | undefined,
  recipientHeaderNames?: string[],
) => {
  const headersToMatch = recipientHeaderNames ?? ['To', 'Cc', 'Bcc', 'From'];
  // Process a pre-parsed header map
  if (isParsedHeaderMap(headers)) {
    const workingHeaders = headers;
    return headersToMatch
      .flatMap((headerName) =>
        workingHeaders.getAllValues(headerName).flatMap((v) =>
          mapContact(
            {
              value: typeof v === 'string' ? v : `${v.name ?? ''} <${v.email}>`,
            },
            headerName.toLocaleLowerCase() as RecipientType,
          ),
        ),
      )
      .filter((x) => !!x);
  }
  // Process a raw header array
  return (
    headers
      ?.flatMap((header) => {
        if (!headersToMatch.includes(header.name ?? 'never-match')) {
          return null;
        }
        return mapContact(
          header,
          header.name?.toLocaleLowerCase() as RecipientType,
        );
      })
      ?.filter((x) => !!x) ?? []
  );
};

type TContactRet<
  TSource extends ArrayElement<gmail_v1.Schema$MessagePart['headers']> | string,
> =
  TSource extends ArrayElement<gmail_v1.Schema$MessagePart['headers']>
    ? Array<ParsedContact>
    : ParsedContact | null;

export const mapContact = <
  TSource extends ArrayElement<gmail_v1.Schema$MessagePart['headers']> | string,
>(
  source: TSource,
  recipientType?: RecipientType,
): TContactRet<TSource> => {
  if (typeof source === 'object') {
    return (source?.value ?? '')
      .split(/[,;]\s+?/)
      .map((v) => mapContact(v, recipientType))
      .filter(Boolean) as TContactRet<TSource>;
  }
  if (typeof source !== 'string') {
    return null as TContactRet<TSource>;
  }
  const matches = /^"?(.*)"?(?=\s<)\s<([^>]+)/g.exec(source ?? '');
  if (!matches) {
    log((l) =>
      l.warn({
        message: `No valid contacts found in header.`,
        header: { value: source },
      }),
    );
    return null as TContactRet<TSource>;
  }
  return {
    fullName: matches[1],
    firstName: matches[1].split(' ')[0],
    lastName: matches[1]
      .split(' ')
      .filter((_, i) => i > 0)
      .join(' '),
    email: matches[2],
    recipientType,
  } as TContactRet<TSource>;
};
