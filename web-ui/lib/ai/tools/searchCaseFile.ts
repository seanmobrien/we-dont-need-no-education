import { log } from '@/lib/logger';
import {
  AiSearchResultEnvelope,
  hybridDocumentSearchFactory,
} from '../services/search';
import { AiSearchToolResult, CaseFileSearchOptions } from './types';
import { LoggedError } from '@/lib/react-util';
import { toolCallbackResultFactory } from './utility';

export const searchCaseFile = async ({
  query,
  options,
}: {
  query: string;
  options?: CaseFileSearchOptions;
}): Promise<AiSearchToolResult> => {
  try {
    const client = hybridDocumentSearchFactory();
    const ret = await client.hybridSearch(query, options);
    log((l) => l.trace('searchCaseFile invoked.', { query, options, ret }));
    return toolCallbackResultFactory(ret);
  } catch (error) {
    return toolCallbackResultFactory<AiSearchResultEnvelope>(
      LoggedError.isTurtlesAllTheWayDownBaby(error, {
        log: true,
        message: 'Error searching policy',
        data: { query, options },
      }),
    );
  }
};
