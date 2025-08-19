import { log } from '@/lib/logger';
import {
  AiSearchResultEnvelope,
  hybridDocumentSearchFactory,
} from '../services/search';
import { AiSearchToolResult, CaseFileSearchOptions } from './types';
import { LoggedError } from '@/lib/react-util/errors/logged-error';
import { toolCallbackResultFactory, toolCallbackResultSchemaFactory } from './utility';
import { appMeters } from '@/lib/site-util/metrics';
import type {
  ServerNotification,
  ServerRequest,
} from '@modelcontextprotocol/sdk/types.js';
import type { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js';
import { AiSearchResultEnvelopeSchema, CaseFileSearchOptionsSchema } from './schemas/searchObjects';
import z from 'zod';

// OpenTelemetry Metrics for SearchCaseFile Tool
const searchCaseFileCounter = appMeters.createCounter(
  'ai_tool_search_case_file_total',
  {
    description: 'Total number of case file search operations',
    unit: '1',
  },
);

const searchCaseFileDurationHistogram = appMeters.createHistogram(
  'ai_tool_search_case_file_duration_ms',
  {
    description: 'Duration of case file search operations',
    unit: 'ms',
  },
);

const searchCaseFileResultsHistogram = appMeters.createHistogram(
  'ai_tool_search_case_file_results_count',
  {
    description: 'Number of results returned by case file search',
    unit: '1',
  },
);

const searchCaseFileErrorCounter = appMeters.createCounter(
  'ai_tool_search_case_file_errors_total',
  {
    description: 'Total number of case file search errors',
    unit: '1',
  },
);

export const localSearchCaseFile = (props: {
  query: string;
  options?: CaseFileSearchOptions;
}) =>
  searchCaseFile(
    props,
    undefined as unknown as RequestHandlerExtra<
      ServerRequest,
      ServerNotification
    >,
  );

export const searchCaseFile = async (
  {
    query,
    options,
  }: {
    query: string;
    options?: CaseFileSearchOptions;
  },
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  extra: RequestHandlerExtra<ServerRequest, ServerNotification>,
): Promise<AiSearchToolResult> => {
  const startTime = Date.now();

  const attributes = {
    has_options: Boolean(options),
    query_length: query.length,
    search_type: 'case_file',
  };

  try {
    const client = hybridDocumentSearchFactory();
    const ret = await client.hybridSearch(query, options);

    const duration = Date.now() - startTime;
    const resultCount = ret.results?.length || 0;

    // Record success metrics
    searchCaseFileCounter.add(1, {
      ...attributes,
      status: 'success',
    });

    searchCaseFileDurationHistogram.record(duration, {
      ...attributes,
      status: 'success',
    });

    searchCaseFileResultsHistogram.record(resultCount, {
      ...attributes,
    });

    log((l) =>
      l.trace('searchCaseFile invoked.', {
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
    searchCaseFileErrorCounter.add(1, {
      ...attributes,
      error_type: 'search_error',
    });

    searchCaseFileDurationHistogram.record(duration, {
      ...attributes,
      status: 'error',
    });

    return toolCallbackResultFactory<AiSearchResultEnvelope>(
      LoggedError.isTurtlesAllTheWayDownBaby(error, {
        log: true,
        message: 'Error searching case file',
        data: { query, options },
      }),
    );
  }
};

export const searchCaseFileConfig ={
  description:
    'Uses hybrid search to find case files based on a query.',
  inputSchema: {
    query: z
      .string()
      .describe('The search query term used to find case files.'),
    options: CaseFileSearchOptionsSchema.optional().describe(
      'Options used to influence the search results, such as scope and pagination.',
    ),
  },
  outputSchema: toolCallbackResultSchemaFactory(
    AiSearchResultEnvelopeSchema,
  ),
  annotations: {
    title: 'Search Case Files',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
} as const;