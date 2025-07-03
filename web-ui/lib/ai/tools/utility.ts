import z, { ZodRawShape } from 'zod';
import {
  CaseFileRequestProps,
  ToolCallbackResult,
  ValidCaseFileRequestProps,
} from './types';
import { isError, LoggedError } from '@/lib/react-util';
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
 * Checks if the provided string is a valid version 4 UUID.
 *
 * A valid UUID v4 is in the format: xxxxxxxx-xxxx-4xxx-[8|9|A|B]xxx-xxxxxxxxxxxx,
 * where 'x' is a hexadecimal digit.
 *
 * @param id - The string to validate as a UUID v4.
 * @returns `true` if the string is a valid UUID v4, otherwise `false`.
 */
const isValidUuid = (id: string): boolean =>
  /[0-9a-z]{8}-[0-9a-z]{4}-4[0-9a-z]{3}-[89ABab][0-9a-z]{3}-[0-9a-z]{12}/i.test(
    id,
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
export const resolveCaseFileId = async (
  documentId: number | string,
): Promise<number | undefined> => {
  let parsedId: number | undefined;
  if (typeof documentId === 'string') {
    const isUuid = isValidUuid(documentId);
    if (isUuid) {
      parsedId = await db.query.documentUnits
        .findFirst({
          where: (du, { eq, and, or }) =>
            or(
              and(eq(du.emailId, documentId), eq(du.documentType, 'email')),
              eq(du.documentPropertyId, documentId),
            ),
          columns: {
            unitId: true,
          },
        })
        .then((result) => result?.unitId)
        .catch((err) => {
          LoggedError.isTurtlesAllTheWayDownBaby(err, {
            log: true,
            source: 'resolvecase_file_id',
            message:
              'Error querying for case file ID - validate document ID format',
            include: { documentId },
          });
          return undefined;
        });
    } else {
      parsedId = parseInt(documentId, 10);
      if (isNaN(parsedId)) {
        parsedId = undefined;
      }
    }
  } else if (typeof documentId === 'number') {
    parsedId = documentId;
  } else {
    parsedId = undefined;
  }
  return parsedId;
};

/**
 * Resolves a batch of case file identifiers to their corresponding numeric IDs.
 *
 * This function processes an array of requests, each containing a `case_file_id` that may be:
 * - A number (already resolved)
 * - A string representing a UUID (pending resolution)
 * - A string that can be parsed as a number (resolved)
 * - An invalid value (ignored)
 *
 * For UUIDs, the function queries the database to find matching records and resolves them to their numeric IDs.
 * Returns an array of objects, each with a resolved numeric `case_file_id`.
 *
 * @param requests - An array of objects containing a `case_file_id` property, which may be a number or string.
 * @returns A promise that resolves to an array of objects with a numeric `case_file_id`.
 */
export const resolveCaseFileIdBatch = async (
  requests: Array<CaseFileRequestProps>,
): Promise<Array<ValidCaseFileRequestProps>> => {
  // First, split up into valid and pending sets, dropping anything so invalid we wont even try
  const { valid, pending } = requests.reduce(
    (acc, request) => {
      // If input is a number then it is valid
      if (typeof request.case_file_id === 'number') {
        acc.valid.push({ case_file_id: request.case_file_id });
        return acc;
      }
      // If input is a uuid then it is pending
      if (isValidUuid(request.case_file_id)) {
        acc.pending.push(request);
        return acc;
      }
      // If inut is a string that can be parsed as a number, then it is valid
      if (typeof request.case_file_id === 'string') {
        const check = request.case_file_id.trim();
        if (/\d+/.test(check)) {
          const parsedId = parseInt(request.case_file_id, 10);
          if (!isNaN(parsedId)) {
            request.case_file_id = parsedId;
            acc.valid.push({
              ...request,
              case_file_id: parsedId,
            });
          }
        }
        return acc;
      }
      // All other values are so hosed we just drop them
      return acc;
    },
    {
      valid: [] as Array<ValidCaseFileRequestProps>,
      pending: [] as Array<CaseFileRequestProps>,
    },
  );
  // Now lets try and look up these GUIDs
  const guids = pending.map((r) => r.case_file_id as string);
  const records = await db.query.documentUnits.findMany({
    where: (du, { and, or, eq, inArray }) =>
      or(
        and(inArray(du.emailId, guids), eq(du.documentType, 'email')),
        inArray(du.documentPropertyId, guids),
      ),
    columns: {
      unitId: true,
      documentPropertyId: true,
      emailId: true,
    },
  });
  // Now use records to translate pending into valid
  const { resolved } = pending.reduce(
    (acc, request) => {
      const record = records.find(
        (r) =>
          r.documentPropertyId === request.case_file_id ||
          r.emailId === request.case_file_id,
      );
      if (record) {
        request.case_file_id = record.unitId;
        acc.resolved.push({
          ...request,
          case_file_id: record.unitId,
        });
      }
      return acc;
    },
    { resolved: valid },
  );
  return resolved;
};
