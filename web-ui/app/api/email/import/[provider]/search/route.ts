import { NextRequest, NextResponse } from 'next/server';
import { googleProviderFactory } from '../_googleProviderFactory';
import { parsePaginationStats } from '../_utilitites';
import { MailQueryBuilder } from '../_mailQueryBuilder';
import { PaginatedResultset } from '@/data-models';
import { EmailSearchResult } from '@/data-models/api/import/email-message';

export const GET = async (
  req: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
) => {
  const { provider } = await (params as unknown as Promise<{
    provider: string;
  }>);
  const factoryResponse = await googleProviderFactory(provider, { req });
  if (factoryResponse instanceof Response) {
    return factoryResponse;
  }
  const { searchParams } = new URL(req.url);
  const query = new MailQueryBuilder()
    .appendQueryParam('from', searchParams.getAll('from'))
    .appendQueryParam('to', searchParams.getAll('to'))
    .appendMessageId(searchParams.getAll('msg-id'));

  const { page, num } = parsePaginationStats(searchParams);

  const labels = searchParams.getAll('label') ?? [];

  const { mail } = factoryResponse;
  const queryResult = await mail.list({
    userId: 'me',
    q: query.build(),
    labelIds: labels.length > 0 ? labels : undefined,
    pageToken: page.length > 0 ? page : undefined,
    maxResults: num,
  });

  const ret: PaginatedResultset<EmailSearchResult, string | undefined> = {
    results:
      queryResult.data?.messages
        ?.filter((x) => !!x.id)
        .map((x) => ({
          id: String(x.id),
          threadId: x.threadId ?? undefined,
        })) ?? [],
    pageStats: {
      page: queryResult.data.nextPageToken ?? undefined,
      num,
      total: queryResult.data.resultSizeEstimate ?? 0,
    },
  };

  return NextResponse.json(ret, { status: 200 });
};
