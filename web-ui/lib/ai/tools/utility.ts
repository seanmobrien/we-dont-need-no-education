import z, { ZodRawShape } from 'zod';
import {
  CaseFileRequestProps,
  ToolCallbackResult,
  ValidCaseFileRequestProps,
} from './types';
import { isError } from '@/lib/react-util/utility-methods';
import { BrandedUuid, isValidUuid as isValidUuidImpl } from '@/lib/typescript/_guards';
import { resolveCaseFileId as resolveCaseFileIdImpl, resolveCaseFileIdBatch as resolveCaseFileIdBatchImpl } from '@/lib/api/document-unit/resolve-case-file-id';
import { deprecate } from '@/lib/nextjs-util';

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
 * Checks if the provided string is a valid version 4 UUID.
 *
 * A valid UUID v4 is in the format: xxxxxxxx-xxxx-4xxx-[8|9|A|B]xxx-xxxxxxxxxxxx,
 * where 'x' is a hexadecimal digit.
 *
 * @param id - The string to validate as a UUID v4.
 * @returns `true` if the string is a valid UUID v4, otherwise `false`.
 */
export const isValidUuid = deprecate(isValidUuidImpl,
  'isValidUuid is deprecated, import from @/lib/typescript/_guards',
  'DEP0002'
);

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
export const resolveCaseFileId = deprecate(
  resolveCaseFileIdImpl,
  'resolveCaseFileId is deprecated, import from @/lib/api/document-unit/resolve-case-file-id',
  'DEP0003'
);

/**
 * Resolves a batch of case file identifiers to their corresponding numeric IDs.
 *
 * This function processes an array of requests, each containing a `caseFileId` that may be:
 * - A number (already resolved)
 * - A string representing a UUID (pending resolution)
 * - A string that can be parsed as a number (resolved)
 * - An invalid value (ignored)
 *
 * For UUIDs, the function queries the database to find matching records and resolves them to their numeric IDs.
 * Returns an array of objects, each with a resolved numeric `caseFileId`.
 *
 * @param requests - An array of objects containing a `caseFileId` property, which may be a number or string.
 * @returns A promise that resolves to an array of objects with a numeric `caseFileId`.
 */
export const resolveCaseFileIdBatch = async (
  requests: Array<CaseFileRequestProps>,
): Promise<Array<ValidCaseFileRequestProps>> =>
  resolveCaseFileIdBatchImpl(requests, {
    getValue: (input: CaseFileRequestProps) => input.caseFileId,
    setValue: (input: CaseFileRequestProps, value: number | BrandedUuid) => ({ ...input, caseFileId: value }),
  }) as Promise<Array<ValidCaseFileRequestProps>>;
