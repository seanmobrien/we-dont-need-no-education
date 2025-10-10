import { toolCallbackResultFactory } from '@/lib/ai/tools/utility';

describe('toolCallbackResultFactory', () => {
  it('should return a structuredContent with result for a successful case', () => {
    const result = { data: 'test' };
    const callbackResult = toolCallbackResultFactory(result);

    expect(callbackResult).toEqual({
      content: [
        {
          type: 'text',
          text: 'tool success',
        },
      ],
      structuredContent: {
        result: {
          isError: false,
          value: result,
        },
      },
    });
  });

  it('should return a structuredContent with isError and message for an error case', () => {
    const error = new Error('Test error');
    const callbackResult = toolCallbackResultFactory(error);

    expect(callbackResult).toEqual({
      isError: true,
      content: [
        {
          type: 'text',
          text: 'Test error',
        },
      ],
      structuredContent: {
        result: {
          isError: true,
          message: 'Test error',
          cause: undefined,
        },
      },
    });
  });

  it('should override the error message if a custom message is provided', () => {
    const error = new Error('Original error message');
    const customMessage = 'Custom error message';
    const callbackResult = toolCallbackResultFactory(error, customMessage);

    expect(callbackResult).toEqual({
      isError: true,
      content: [
        {
          type: 'text',
          text: customMessage,
        },
      ],
      structuredContent: {
        result: {
          isError: true,
          message: customMessage,
          cause: undefined,
        },
      },
    });
  });
});
