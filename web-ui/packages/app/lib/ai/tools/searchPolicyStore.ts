import { log } from '@compliance-theater/lib-logger';
import {
  AiSearchResultEnvelope,
  hybridPolicySearchFactory,
} from '../services/search';
import { AiSearchToolResult, PolicySearchOptions } from './types';
import { LoggedError } from '@/lib/react-util/errors/logged-error';
import {
  toolCallbackResultFactory,
  toolCallbackResultSchemaFactory,
} from './utility';
import { appMeters } from '@/lib/site-util/metrics';
import z from 'zod';
import {
  AiSearchResultEnvelopeSchema,
  PolicySearchOptionsSchema,
} from './schemas/searchObjects';

// OpenTelemetry Metrics for SearchPolicyStore Tool
const searchPolicyStoreCounter = appMeters.createCounter(
  'ai_tool_search_policy_store_total',
  {
    description: 'Total number of policy store search operations',
    unit: '1',
  },
);

const searchPolicyStoreDurationHistogram = appMeters.createHistogram(
  'ai_tool_search_policy_store_duration_ms',
  {
    description: 'Duration of policy store search operations',
    unit: 'ms',
  },
);

const searchPolicyStoreResultsHistogram = appMeters.createHistogram(
  'ai_tool_search_policy_store_results_count',
  {
    description: 'Number of results returned by policy store search',
    unit: '1',
  },
);

const searchPolicyStoreErrorCounter = appMeters.createCounter(
  'ai_tool_search_policy_store_errors_total',
  {
    description: 'Total number of policy store search errors',
    unit: '1',
  },
);

export const searchPolicyStore = async ({
  query,
  options,
}: {
  query: string;
  options?: PolicySearchOptions;
}): Promise<AiSearchToolResult> => {
  const startTime = Date.now();

  const attributes = {
    has_options: Boolean(options),
    query_length: query.length,
    search_type: 'policy_store',
  };

  try {
    const client = hybridPolicySearchFactory();
    const ret = await client.hybridSearch(query, options);

    const duration = Date.now() - startTime;
    const resultCount = ret.results?.length || 0;

    // Record success metrics
    searchPolicyStoreCounter.add(1, {
      ...attributes,
      status: 'success',
    });

    searchPolicyStoreDurationHistogram.record(duration, {
      ...attributes,
      status: 'success',
    });

    searchPolicyStoreResultsHistogram.record(resultCount, {
      ...attributes,
    });

    log((l) =>
      l.trace('searchPolicyStore invoked.', {
        query,
        options,
        resultCount,
        durationMs: duration,
      }),
    );

    return toolCallbackResultFactory(ret);
  } catch (error) {
    const duration = Date.now() - startTime;

    // Record error metrics
    searchPolicyStoreErrorCounter.add(1, {
      ...attributes,
      error_type: 'search_error',
    });

    searchPolicyStoreDurationHistogram.record(duration, {
      ...attributes,
      status: 'error',
    });

    return toolCallbackResultFactory<AiSearchResultEnvelope>(
      LoggedError.isTurtlesAllTheWayDownBaby(error, {
        log: true,
        message: 'Error searching policy',
        data: { query, options },
      }),
    );
  }
};

export const searchPolicyStoreConfig = {
  description: 'Uses hybrid search to find policies based on a query.',
  inputSchema: {
    query: z.string().describe('The search query term used to find policies.'),
    options: PolicySearchOptionsSchema.optional().describe(
      'Options used to influence the search results, such as scope and pagination.',
    ),
  },
  outputSchema: toolCallbackResultSchemaFactory(AiSearchResultEnvelopeSchema),
  annotations: {
    title: 'Search Policy Store',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
} as const;
