import { log } from '@/lib/logger';
import {
  AiSearchResultEnvelope,
  hybridPolicySearchFactory,
} from '../services/search';
import { AiSearchToolResult, PolicySearchOptions } from './types';
import { LoggedError } from '@/lib/react-util';
import { toolCallbackResultFactory } from './utility';

export const searchPolicyStore = async ({
  query,
  options,
}: {
  query: string;
  options?: PolicySearchOptions;
}): Promise<AiSearchToolResult> => {
  try {
    const client = hybridPolicySearchFactory();
    const ret = await client.hybridSearch(query, options);
    log((l) => l.trace('searchPolicyStore invoked.', { query, options, ret }));
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
