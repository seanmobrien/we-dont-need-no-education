/**
 * @jest-environment node
 */

import { setupImpersonationMock } from '../../../../jest.mock-impersonation';

setupImpersonationMock();

const fetchMock = jest.fn();
const neo4jRunMock = jest.fn();
const neo4jExecuteReadMock = jest.fn();
const neo4jSessionCloseMock = jest.fn();
const neo4jSessionMock = jest.fn();
const neo4jDriverCloseMock = jest.fn();
const neo4jDriverMock = jest.fn();

jest.mock('../../../../../lib/fetch-service', () => ({
  resolveFetchService: jest.fn(
    () =>
      (...args: unknown[]) =>
        (globalThis.fetch as unknown as (...args: unknown[]) => unknown)(
          ...args,
        ),
  ),
}));

jest.mock('@compliance-theater/feature-flags/server', () => ({
  getFeatureFlag: jest.fn(),
}));

jest.mock('@compliance-theater/database/driver', () => ({
  pgDbWithInit: jest.fn(),
}));

jest.mock('@compliance-theater/auth/lib/resources/case-file/index', () => ({
  getAccessibleUserIds: jest.fn(),
}));

jest.mock('neo4j-driver', () => ({
  __esModule: true,
  default: {
    driver: (...args: unknown[]) => neo4jDriverMock(...args),
    auth: {
      basic: jest.fn((username: string, password: string) => ({
        username,
        password,
      })),
    },
    isInt: () => false,
  },
}));

import { hybridDocumentSearchFactory } from '../../../../../lib/ai/services/search/HybridDocumentSearch';
import { hybridPolicySearchFactory } from '../../../../../lib/ai/services/search/HybridPolicySearch';
import { getFeatureFlag } from '@compliance-theater/feature-flags/server';
import { pgDbWithInit } from '@compliance-theater/database/driver';
import { getAccessibleUserIds } from '@compliance-theater/auth/lib/resources/case-file/index';

const makeEmbeddingService = () => ({
  embed: jest.fn().mockResolvedValue([0.11, 0.22, 0.33]),
});

const mockFlagProviders = ({
  retrieval = 'azure',
  graph = 'none',
}: {
  retrieval?: string;
  graph?: string;
} = {}) => {
  (getFeatureFlag as jest.Mock).mockImplementation(async (flagName: string) => {
    if (flagName === 'search_case_file_retrieval_provider') {
      return retrieval;
    }
    if (flagName === 'search_case_file_graph_augmentation_provider') {
      return graph;
    }
    return null;
  });
};

describe('Hybrid search provider routing', () => {
  beforeEach(() => {
    (globalThis as { fetch?: typeof fetch }).fetch = fetchMock as typeof fetch;
    fetchMock.mockReset();
    (pgDbWithInit as jest.Mock).mockReset();
    (getFeatureFlag as jest.Mock).mockReset();
    (getAccessibleUserIds as jest.Mock).mockReset();
    (getAccessibleUserIds as jest.Mock).mockResolvedValue([123]);
    neo4jRunMock.mockReset();
    neo4jExecuteReadMock.mockReset();
    neo4jExecuteReadMock.mockImplementation(
      async (
        callback: (tx: { run: typeof neo4jRunMock }) => unknown,
      ) => callback({ run: neo4jRunMock }),
    );
    neo4jSessionCloseMock.mockReset();
    neo4jSessionMock.mockReset();
    neo4jSessionMock.mockReturnValue({
      executeRead: neo4jExecuteReadMock,
      close: neo4jSessionCloseMock,
    });
    neo4jDriverCloseMock.mockReset();
    neo4jDriverMock.mockReset();
    neo4jDriverMock.mockReturnValue({
      session: neo4jSessionMock,
      close: neo4jDriverCloseMock,
    });
    delete process.env.NEO4J_URI;
    delete process.env.NEO4J_USERNAME;
    delete process.env.NEO4J_PASSWORD;
    delete process.env.NEO4J_DATABASE;
  });

  test('routes case-file search to Azure by default', async () => {
    mockFlagProviders({ retrieval: 'azure', graph: 'none' });
    const embeddingService = makeEmbeddingService();
    fetchMock.mockResolvedValue({
      json: async () => ({ value: [] }),
      headers: { get: () => null },
    });

    const client = hybridDocumentSearchFactory({ embeddingService });
    await client.hybridSearch('test query', { hitsPerPage: 5 });

    expect(embeddingService.embed).toHaveBeenCalledWith('test query');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(pgDbWithInit).not.toHaveBeenCalled();
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.vectorQueries[0].k).toBe(50);
  });

  test('keeps threadId string value in Azure filters', async () => {
    mockFlagProviders({ retrieval: 'azure', graph: 'none' });
    const embeddingService = makeEmbeddingService();
    fetchMock.mockResolvedValue({
      json: async () => ({ value: [] }),
      headers: { get: () => null },
    });

    const client = hybridDocumentSearchFactory({ embeddingService });
    await client.hybridSearch('thread query', { threadId: '000123' });

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.filter).toContain("a/key eq 'thread_id' and a/value eq '000123'");
  });

  test('routes case-file search to PostgreSQL when enabled', async () => {
    mockFlagProviders({ retrieval: 'postgresql', graph: 'none' });
    const embeddingService = makeEmbeddingService();
    const sql = jest.fn().mockResolvedValue([
      {
        document_id: 42,
        content: 'postgres row',
        document_type: 'email',
        email_id: 'f3f39fe9-9278-4f1e-8d56-4ea7349e76a2',
        thread_id: 12,
        attachment_id: null,
        reply_to_document_id: null,
        related_documents: [99],
        lexical_score: 0.4,
        vector_score: 0.6,
        combined_score: 0.53,
        total_count: 1,
      },
    ]);
    (pgDbWithInit as jest.Mock).mockResolvedValue(sql);

    const client = hybridDocumentSearchFactory({ embeddingService });
    const result = await client.hybridSearch('query', { count: true });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(pgDbWithInit).toHaveBeenCalledTimes(1);
    expect(getAccessibleUserIds).toHaveBeenCalledWith(undefined);
    expect(sql).toHaveBeenCalled();
    expect(result.results[0].id).toBe('42');
    expect(result.total).toBe(1);
  });

  test('applies graph augmentation reranking when neo4j mode is enabled', async () => {
    mockFlagProviders({ retrieval: 'azure', graph: 'neo4j' });
    const embeddingService = makeEmbeddingService();
    process.env.NEO4J_URI = 'neo4j://localhost:7687';
    process.env.NEO4J_USERNAME = 'neo4j';
    process.env.NEO4J_PASSWORD = 'test-password';
    process.env.NEO4J_DATABASE = 'neo4j';
    neo4jRunMock.mockResolvedValue({
      records: [
        {
          get: (field: string) =>
            field === 'documentId' ? 2 : field === 'scoreBoost' ? 0.6 : null,
        },
      ],
    });
    fetchMock.mockResolvedValue({
      json: async () => ({
        value: [
          {
            id: '1',
            content: 'first',
            metadata: {
              attributes: [{ key: 'thread_id', value: '100' }],
            },
            '@search.score': 0.8,
          },
          {
            id: '2',
            content: 'second',
            metadata: {
              attributes: [{ key: 'thread_id', value: '200' }],
            },
            '@search.score': 0.7,
          },
        ],
      }),
      headers: { get: () => null },
    });

    const client = hybridDocumentSearchFactory({ embeddingService });
    const result = await client.hybridSearch('query', { threadId: '200' });

    expect(result.results[0].id).toBe('2');
    expect(result.results[0].metadata?.graph_augmentation_provider).toBe('neo4j');
    expect(neo4jDriverMock).toHaveBeenCalledTimes(1);
    expect(neo4jRunMock).toHaveBeenCalledTimes(1);
  });
});

describe('HybridPolicySearch remains Azure-backed', () => {
  beforeEach(() => {
    (globalThis as { fetch?: typeof fetch }).fetch = fetchMock as typeof fetch;
    fetchMock.mockReset();
  });

  test('applies mapped policy scope filters on Azure payload', async () => {
    const embeddingService = makeEmbeddingService();
    fetchMock.mockResolvedValue({
      json: async () => ({ value: [] }),
      headers: { get: () => null },
    });

    const client = hybridPolicySearchFactory({ embeddingService });
    await client.hybridSearch('policy query', { scope: ['state'] });
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);

    expect(body.filter).toMatch(/document_type/);
    expect(body.filter).toContain("'2'");
  });
});
