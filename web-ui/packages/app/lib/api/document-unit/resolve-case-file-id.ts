import { drizDbWithInit } from '@compliance-theater/database/orm';
import { LoggedError } from '@compliance-theater/logger';
import {
  ArrayElement,
  isValidUuid,
  BrandedUuid,
} from '@compliance-theater/typescript';

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
  documentId: number | string | undefined,
): Promise<number | undefined> => {
  if (!documentId) {
    return undefined;
  }
  let parsedId: number | undefined;
  if (typeof documentId === 'string') {
    // UUID v4 format validation: xxxxxxxx-xxxx-4xxx-[89ab]xxx-xxxxxxxxxxxx
    // Must contain only hexadecimal digits (0-9, a-f, A-F) and hyphens
    const uuidFormatRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
    const isValidFormat = uuidFormatRegex.test(documentId);
    const isUuid = isValidFormat && isValidUuid(documentId);
    if (isUuid) {
      parsedId = await drizDbWithInit((db) =>
        db.query.documentUnits
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
              source: 'resolveCaseFileId',
              message:
                'Error querying for case file ID - validate document ID format',
              include: { documentId },
            });
            return undefined;
          }),
      );
    } else {
      parsedId = parseInt(documentId, 10);
      if (isNaN(parsedId) || parsedId < 1) {
        parsedId = undefined;
      }
    }
  } else if (typeof documentId === 'number') {
    parsedId = documentId < 1 ? undefined : documentId;
  } else {
    parsedId = undefined;
  }
  return parsedId;
};

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
export const resolveCaseFileIdBatch = async <T extends Array<unknown>>(
  requests: T,
  options?: {
    getValue: (input: ArrayElement<T>) => string | number;
    setValue: (
      input: ArrayElement<T>,
      value: number | BrandedUuid,
    ) => ArrayElement<T>;
  },
): Promise<Array<ArrayElement<T>>> => {
  const { getValue, setValue } = options ?? {
    getValue: (input: ArrayElement<T>) => input as unknown as string | number,
    setValue: (_input: ArrayElement<T>, value: number | BrandedUuid) =>
      value as ArrayElement<T>,
  };

  // First, split up into valid and pending sets, dropping anything so invalid we wont even try
  const { valid, pending } = requests.reduce<{
    valid: Array<ArrayElement<T>>;
    pending: Array<ArrayElement<T>>;
  }>(
    (acc, req) => {
      const request = req as ArrayElement<T>;
      const value = getValue(request);
      // If input is a number then it is valid
      if (typeof value === 'number') {
        acc.valid.push(setValue(request, value));
        return acc;
      }
      // If input is a string, check if it's a UUID or numeric string
      if (typeof value === 'string') {
        // First check if it's a valid UUID
        if (isValidUuid(value)) {
          acc.pending.push(setValue(request, value));
          return acc;
        }

        // Then check if it's a valid numeric string
        const check = value.trim();
        if (/^-?\d+$/.test(check)) {
          const parsedId = parseInt(value, 10);
          if (!isNaN(parsedId)) {
            acc.valid.push(setValue(request, parsedId));
          }
        }
        return acc;
      }
      // All other values are so hosed we just drop them
      return acc;
    },
    {
      valid: [],
      pending: [],
    },
  );

  // Now lets try and look up these GUIDs
  const guids = pending.map((x) => getValue(x) as BrandedUuid);
  if (!guids.length) {
    return valid;
  }
  const records = await drizDbWithInit((db) => {
    return db.query.documentUnits.findMany({
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
  });
  // Now use records to translate pending into valid
  const { resolved } = pending.reduce(
    (acc, request) => {
      const matchValue = getValue(request);
      const record = records.find(
        (r) => r.documentPropertyId === matchValue || r.emailId === matchValue,
      );
      if (record) {
        acc.resolved.push(setValue(request, record.unitId));
      }
      return acc;
    },
    { resolved: valid },
  );
  return resolved;
};
