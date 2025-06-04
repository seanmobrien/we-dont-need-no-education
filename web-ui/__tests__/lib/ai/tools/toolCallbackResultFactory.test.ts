import { toolCallbackResultFactory } from '../../../../lib/ai/tools/toolCallbackResultFactory';

describe('toolCallbackResultFactory', () => {
  it('should return a structuredContent with result for a successful case', () => {
    const result = { data: 'test' };
    const callbackResult = toolCallbackResultFactory(result);

    expect(callbackResult).toEqual({
      structuredContent: {
        result,
      },
    });
  });

  it('should return a structuredContent with isError and message for an error case', () => {
    const error = new Error('Test error');
    const callbackResult = toolCallbackResultFactory(error);

    expect(callbackResult).toEqual({
      structuredContent: {
        result: undefined,
        isError: true,
        message: 'Test error',
      },
    });
  });

  it('should override the error message if a custom message is provided', () => {
    const error = new Error('Original error message');
    const customMessage = 'Custom error message';
    const callbackResult = toolCallbackResultFactory(error, customMessage);

    expect(callbackResult).toEqual({
      structuredContent: {
        result: undefined,
        isError: true,
        message: customMessage,
      },
    });
  });
});
