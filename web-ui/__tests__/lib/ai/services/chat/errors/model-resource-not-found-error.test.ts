import { ModelResourceNotFoundError, isModelResourceNotFoundError } from '@/lib/ai/services/chat/errors/model-resource-not-found-error';

describe('ModelResourceNotFoundError', () => {
  test('type guard identifies real instance', () => {
    const err = new ModelResourceNotFoundError({
      resourceType: 'provider',
      normalized: 'azure-openai.chat',
      inputRaw: 'azure-openai.chat',
      message: 'Provider not found: azure-openai.chat',
    });
    expect(err.name).toBe('ModelResourceNotFoundError');
    expect(isModelResourceNotFoundError(err)).toBe(true);
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

    expect(isModelResourceNotFoundError(duck)).toBe(true);
  });

  test('type guard rejects non-errors', () => {
    expect(isModelResourceNotFoundError(null)).toBe(false);
    expect(isModelResourceNotFoundError(undefined)).toBe(false);
    expect(isModelResourceNotFoundError({})).toBe(false);
  });
});
