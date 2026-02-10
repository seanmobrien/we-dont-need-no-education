/**
 * Utility functions for Google email import
 * @module @/lib/email/import/google/utilities
 */
import type { gmail_v1 } from 'googleapis';
import type { ArrayElement } from '@compliance-theater/typescript';
import type { ParsedHeaderMap } from '../../parsedHeaderMap';
import type { ParsedContact, RecipientType } from '../types';

declare module '@/lib/email/import/google/utilities' {
  export type TContactRet<
    TSource extends ArrayElement<gmail_v1.Schema$MessagePart['headers']> | string,
  > =
    TSource extends ArrayElement<gmail_v1.Schema$MessagePart['headers']>
      ? Array<ParsedContact>
      : ParsedContact | null;

  export function mapContact<
    TSource extends ArrayElement<gmail_v1.Schema$MessagePart['headers']> | string,
  >(
    source: TSource,
    recipientType?: RecipientType,
  ): TContactRet<TSource>;

  export function mapContacts(
    headers: gmail_v1.Schema$MessagePart['headers'] | ParsedHeaderMap | undefined,
    recipientHeaderNames?: string[],
  ): ParsedContact[];

}
