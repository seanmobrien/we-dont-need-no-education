import {
  ResourceNotFoundError,
  isResourceNotFoundError,
} from '@/lib/ai/services/chat/errors/resource-not-found-error';

describe('ResourceNotFoundError', () => {
  test('type guard identifies real instance', () => {
    const err = new ResourceNotFoundError({
      resourceType: 'provider',
      normalized: 'azure-openai.chat',
      inputRaw: 'azure-openai.chat',
      message: 'Provider not found: azure-openai.chat',
    });
    expect(err.name).toBe('ResourceNotFoundError');
    expect(isResourceNotFoundError(err)).toBe(true);
    expect(err.resourceType).toBe('provider');
    expect(err.shortMessage).toContain('Provider not found');
  });

  test('type guard accepts duck-typed error objects', () => {
    const duck = {
      name: 'SomeOtherError',
      message: 'boom',
      resourceType: 'model' as const,
      normalized: 'prov-1:gpt-4',
      inputRaw: { provider: 'p', model: 'm' },
      shortMessage: 'Model not found',
    } as unknown as Error;

    expect(isResourceNotFoundError(duck)).toBe(true);
  });

  test('type guard rejects non-errors', () => {
    expect(isResourceNotFoundError(null)).toBe(false);
    expect(isResourceNotFoundError(undefined)).toBe(false);
    expect(isResourceNotFoundError({})).toBe(false);
  });
});
