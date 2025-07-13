import z, { ZodRawShape } from 'zod';
import { ToolCallbackResult } from './types';
import { isError } from '@/lib/react-util';
import { db } from '@/lib/drizzle-db/connection';

interface ToolCallbackResultOverloads {
  <T>(result: T): ToolCallbackResult<T>;
  <T>(error: Error, message?: string): ToolCallbackResult<T>;
}

export const toolCallbackResultFactory: ToolCallbackResultOverloads = <T>(
  result: T | Error,
  message?: string,
): ToolCallbackResult<T> => {
  if (isError(result)) {
    return {
      content: [{ type: 'text', text: message ?? result.message }],
      structuredContent: {
        result: {
          isError: true,
          message: message ?? result.message,
          cause: result.cause,
        },
      },
      isError: true,
    };
  }
  return Array.isArray(result)
    ? {
        content: [{ type: 'text', text: 'tool success' }],
        structuredContent: {
          result: {
            isError: false,
            items: result as T extends Array<infer U> ? Array<U> : never,
          },
        },
      }
    : {
        content: [{ type: 'text', text: 'tool success' }],
        structuredContent: {
          result: {
            isError: false,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            value: result as T extends Array<any> ? never : T,
          },
        },
      };
};

export const toolCallbackResultSchemaFactory = <T extends ZodRawShape>(
  resultSchema:
    | z.ZodObject<T>
    | z.ZodString
    | z.ZodUnion<[z.ZodString, z.ZodObject<T>]>,
) => {
  const error = z.object({
    isError: z.literal(true),
    message: z.string().optional(),
    cause: z.any().optional(),
  });

  const success = z.object({
    isError: z.literal(false).optional(),
    value: resultSchema.optional(),
  });

  const result = z.discriminatedUnion('isError', [error, success]);

  return {
    result: result,
    //.describe('The returned value.')
  };
};
export const toolCallbackArrayResultSchemaFactory = <T extends ZodRawShape>(
  resultSchema:
    | z.ZodObject<T>
    | z.ZodString
    | z.ZodUnion<[z.ZodString, z.ZodObject<T>]>,
) => {
  const error = z.object({
    isError: z.literal(true),
    message: z.string().optional(),
    cause: z.any().optional(),
  });

  const success = z.object({
    isError: z.literal(false).optional(),
    items: z.array(resultSchema).optional(),
  });

  const result = z.discriminatedUnion('isError', [error, success]);

  return {
    result,
  };
};

/**
 * Resolves a case file's unit ID from a given document identifier.
 *
 * The function attempts to parse the provided `documentId` as a number.
 * If the `documentId` is a string that does not represent a number (e.g., a GUID or other non-numeric string),
 * it queries the database to find a matching document unit by `emailId` (with `documentType` 'email')
 * or by `documentPropertyId`. If a match is found, the corresponding `unitId` is returned.
 *
 * @param documentId - The identifier of the document, which can be a number or a string.
 * @returns A promise that resolves to the unit ID as a number, or `undefined` if not found.
 */
export const resolveCaseFileId = async (
  documentId: number | string,
): Promise<number | undefined> => {
  let parsedId: number | undefined;
  if (typeof documentId === 'string') {
    parsedId = /[a-f]|-/i.test(documentId) ? NaN : parseInt(documentId, 10);
    if (isNaN(parsedId)) {
      parsedId = await db.query.documentUnits
        .findFirst({
          where: (du, { eq, and }) =>
            and(eq(du.emailId, documentId), eq(du.documentType, 'email')),
          columns: {
            unitId: true,
          },
        })
        .then((result) => result?.unitId);
      if (!parsedId) {
        parsedId = await db.query.documentUnits
          .findFirst({
            where: (du, { eq }) => eq(du.documentPropertyId, documentId),
            columns: {
              unitId: true,
            },
          })
          .then((result) => result?.unitId);
      }
    }
  } else if (typeof documentId === 'number') {
    parsedId = documentId;
  } else {
    parsedId = undefined;
  }
  return parsedId;
};
