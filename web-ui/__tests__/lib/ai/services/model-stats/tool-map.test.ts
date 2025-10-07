import { ToolMap } from '/lib/ai/services/model-stats/tool-map';
import type { ChatToolType } from '/lib/drizzle-db/drizzle-types';
import {
  ResourceNotFoundError,
  isResourceNotFoundError,
} from '/lib/ai/services/chat/errors/resource-not-found-error';

describe('ToolMap', () => {
  const toolA: ChatToolType = {
    chatToolId: '11111111-1111-1111-1111-111111111111',
    toolName: 'searchPolicyStore',
    inputSchema: '{"type":"object"}',
    outputSchema: '{"type":"object"}',
    description: 'Search policies in the store',
  } as ChatToolType;

  const toolB: ChatToolType = {
    chatToolId: '22222222-2222-2222-2222-222222222222',
    toolName: 'searchCaseFile',
    inputSchema: '{"type":"object"}',
    outputSchema: '{"type":"object"}',
    description: 'Search case files',
  } as ChatToolType;

  beforeEach(() => {
    ToolMap.reset();
  });

  test('setupMockInstance seeds records and Instance is available', async () => {
    const map = ToolMap.setupMockInstance([
      [toolA.chatToolId, toolA],
      [toolB.chatToolId, toolB],
    ]);

    await map.whenInitialized;

    expect(map.initialized).toBe(true);
    expect(ToolMap.Instance).toBe(map);
    expect(map.allIds.sort()).toEqual(
      [toolA.chatToolId, toolB.chatToolId].sort(),
    );
    expect(map.allNames.sort()).toEqual(
      [toolA.toolName, toolB.toolName].sort(),
    );
    expect(Array.from(map.entries).length).toBe(2);
  });

  test('lookup by id and name returns correct records', async () => {
    const map = ToolMap.setupMockInstance([
      [toolA.chatToolId, toolA],
      [toolB.chatToolId, toolB],
    ]);
    await map.whenInitialized;

    // by id
    expect(map.record(toolA.chatToolId)?.toolName).toBe('searchPolicyStore');
    expect(map.name(toolA.chatToolId)).toBe('searchPolicyStore');
    expect(map.id(toolA.chatToolId)).toBe(toolA.chatToolId);

    // by name
    expect(map.record('searchCaseFile')?.chatToolId).toBe(toolB.chatToolId);
    expect(map.name('searchCaseFile')).toBe('searchCaseFile');
    expect(map.id('searchCaseFile')).toBe(toolB.chatToolId);

    // contains
    expect(map.contains(toolA.chatToolId)).toBe(true);
    expect(map.contains('searchCaseFile')).toBe(true);
  });

  test('recordOrThrow / idOrThrow / nameOrThrow throw ResourceNotFoundError for missing', async () => {
    const map = ToolMap.setupMockInstance([[toolA.chatToolId, toolA]]);
    await map.whenInitialized;

    const missing = 'does-not-exist';

    expect(() => map.recordOrThrow(missing)).toThrow(ResourceNotFoundError);
    try {
      map.recordOrThrow(missing);
    } catch (e) {
      expect(isResourceNotFoundError(e)).toBe(true);
    }

    expect(() => map.idOrThrow(missing)).toThrow(ResourceNotFoundError);
    expect(() => map.nameOrThrow(missing)).toThrow(ResourceNotFoundError);
  });
});
