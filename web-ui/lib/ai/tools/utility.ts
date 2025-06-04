import z, { ZodRawShape } from 'zod';
import { ToolCallbackResult } from './types';

interface ToolCallbackResultOverloads {
  <T>(result: T): ToolCallbackResult<T>;
  <T>(error: Error, message?: string): ToolCallbackResult<T>;
}

export const toolCallbackResultFactory: ToolCallbackResultOverloads = <T>(
  result: T | Error,
  message?: string,
): ToolCallbackResult<T> => {
  if (result instanceof Error) {
    return {
      content: [{ type: 'text', text: result.message }],
      structuredContent: {
        result: undefined,
        isError: true,
        message: message || result.message,
      },
      isError: true,
    };
  }
  return {
    content: [{ type: 'text', text: 'tool success' }],
    structuredContent: {
      isError: false,
      result,
    },
  };
};

export const toolCallbackResultSchemaFactory = <T extends ZodRawShape>(
  resultSchema: z.ZodObject<T>,
) => {
  return {
    result: resultSchema
      .extend({})
      .or(z.undefined())
      .describe('The content of the tool result.'),
    isError: z
      .boolean()
      .describe('Indicates whether an error occurred during the operation.'),
    message: z
      .string()
      .optional()
      .describe(
        'An error message if the retrieval failed. Only present if isError is true.',
      ),
  };
};
export const toolCallbackArrayResultSchemaFactory = <T extends ZodRawShape>(
  resultSchema: z.ZodObject<T>,
) => {
  return {
    result: z
      .array(resultSchema)
      .or(z.undefined())
      .describe('The content of the tool result.'),
    isError: z
      .boolean()
      .describe('Indicates whether an error occurred during the operation.'),
    message: z
      .string()
      .optional()
      .describe(
        'An error message if the retrieval failed. Only present if isError is true.',
      ),
  };
};
