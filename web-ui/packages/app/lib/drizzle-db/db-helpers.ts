import { eq, and } from 'drizzle-orm';
import {
  documentRelationship,
  documentRelationshipReason,
  documentUnits,
  documentProperty,
} from '@/drizzle/schema';
import type {
  DatabaseType,
  DbTransactionType,
  DocumentPropertyType,
  DocumentRelationshipType,
} from './drizzle-types';
import { schema } from './schema';
import { log } from '@compliance-theater/lib-logger';
import { LoggedError } from '../react-util';
import { newUuid } from '../typescript';
import { EmailPropertyTypeTypeId } from '@/data-models/api/email-properties/property-type';

/**
 * Resolves a relationship reason into a valid relationship reason ID.
 *
 * @param db - The database instance or transaction to use.
 * @param reason - The reason to resolve, which can be a string, number, or undefined.
 * @param add - Whether to add the reason to the database if it does not exist. Defaults to true.
 * @returns The resolved relationship reason ID, or undefined if the reason is invalid.
 *
 * @example
 * ```typescript
 * const reasonId = await getDocumentRelationReason({
 *   db,
 *   reason: 'Duplicate',
 *   add: true,
 * });
 * console.log(reasonId); // Outputs the ID of the reason
 * ```
 */
export const getDocumentRelationReason = async ({
  db,
  reason,
  add = true,
}: {
  db: DatabaseType | DbTransactionType;
  add?: boolean;
  reason: string | number | undefined | null;
}) => {
  if (typeof reason === 'number') {
    return reason;
  }
  const normalized = reason?.toString()?.trim()?.toLowerCase();
  if (!normalized) {
    return undefined;
  }
  const alreadyNumber = Number(normalized);
  if (!isNaN(alreadyNumber)) {
    return alreadyNumber;
  }
  const rows =
    (await db
      .select({
        relationReasonId: schema.documentRelationshipReason.relationReasonId,
      })
      .from(schema.documentRelationshipReason)
      .where(eq(schema.documentRelationshipReason.description, normalized))
      .limit(1)
      .execute()) ?? [];
  if (rows.length > 0) {
    const { relationReasonId } = rows[0];
    if (relationReasonId || !add) {
      return relationReasonId;
    }
  }
  const [{ relationReasonId: newRelationReasonId } = {}] = await db
    .insert(documentRelationshipReason)
    .values({ description: normalized })
    .returning();
  return newRelationReasonId;
};

type LikeDocumentRelationshipType = Omit<
  DocumentRelationshipType,
  'timestamp' | 'relationshipReasonId'
> & {
  relationshipReasonId: number | string;
};

/**
 * Adds document relationships to the database.
 *
 * @param db - The database transaction to use.
 * @param addDocumentRelations - An array of document relationships to add.
 * @returns An array of added document relationships.
 *
 * @example
 * ```typescript
 * const relationships = await addDocumentRelations({
 *   db,
 *   addDocumentRelations: [
 *     {
 *       sourceDocumentId: 1,
 *       targetDocumentId: 2,
 *       relationshipReasonId: 'Duplicate',
 *     },
 *   ],
 * });
 * console.log(relationships); // Outputs the added relationships
 * ```
 */
export const addDocumentRelations = async ({
  db,
  addDocumentRelations,
}: {
  db: DbTransactionType;
  addDocumentRelations?: Array<LikeDocumentRelationshipType>;
}): Promise<Array<DocumentRelationshipType>> => {
  if (!addDocumentRelations?.length) {
    return [];
  }
  try {
    const values = (
      await Promise.all(
        addDocumentRelations.map(
          ({
            sourceDocumentId,
            targetDocumentId,
            relationshipReasonId: reason,
          }) =>
            new Promise<Omit<DocumentRelationshipType, 'timestamp'>>(
              async (resolve, reject) => {
                try {
                  // Resolve incoming reason into a valid relationship id
                  const relationshipReasonId = await getDocumentRelationReason({
                    db,
                    reason,
                  });
                  if (!relationshipReasonId) {
                    throw new Error('Failed to get relationship reason ID');
                  }
                  // Check if the relationship already exists

                  const exists = await db
                    .select()
                    .from(schema.documentRelationship)
                    .where(
                      and(
                        eq(
                          schema.documentRelationship.sourceDocumentId,
                          sourceDocumentId,
                        ),
                        eq(
                          schema.documentRelationship.targetDocumentId,
                          targetDocumentId,
                        ),
                        eq(
                          schema.documentRelationship.relationshipReasonId,
                          relationshipReasonId,
                        ),
                      ),
                    )
                    .limit(1)
                    .execute();
                  if (exists && exists.length > 0) {
                    log((l) =>
                      l.warn(
                        'Document relationship already exists - skipping',
                        {
                          sourceDocumentId,
                          targetDocumentId,
                          relationshipReasonId,
                        },
                      ),
                    );
                    resolve(undefined as unknown as DocumentRelationshipType);
                  } else {
                    resolve({
                      sourceDocumentId,
                      targetDocumentId,
                      relationshipReasonId,
                    });
                  }
                } catch (error) {
                  reject(error);
                }
              },
            ),
        ),
      )
    ).filter(Boolean);
    if (!values.length) {
      return [];
    }
    return await db.insert(documentRelationship).values(values).returning();
  } catch (error) {
    throw LoggedError.isTurtlesAllTheWayDownBaby(error, {
      log: true,
      source: 'addDocumentRelations',
      data: { addDocumentRelations },
    });
  }
};

type AddNoteRetVal<TNotes> =
  TNotes extends Array<string>
  ? Promise<Array<DocumentPropertyType>>
  : TNotes extends string
  ? Promise<DocumentPropertyType>
  : TNotes extends Array<{
    policyBasis: string[];
    tags: string[];
    note: string;
  }>
  ? Promise<Array<DocumentPropertyType>>
  : TNotes extends { policyBasis: string[]; tags: string[]; note: string }
  ? Promise<DocumentPropertyType>
  : TNotes extends []
  ? Promise<Array<DocumentPropertyType>>
  : never;

export const addNotesToDocument = async <
  TNotes extends
  | string
  | Array<string>
  | { policyBasis: string[]; tags: string[]; note: string }
  | Array<{ policyBasis: string[]; tags: string[]; note: string }>,
>({
  db,
  notes: notesFromProps,
  documentId: documentIdFromProps,
}: {
  db: DbTransactionType | DatabaseType;
  notes: TNotes;
  documentId: number;
}): Promise<AddNoteRetVal<TNotes>> => {
  if (!('documentUnits' in db.query)) {
    throw new Error(
      'Invalid database instance - must be a transaction or query builder',
    );
  }
  // If db is a query builder, we need to get the actual db instance
  const record = await db.query.documentUnits.findFirst({
    where: eq(schema.documentUnits.unitId, documentIdFromProps),
    columns: {
      emailId: true,
      attachmentId: true,
      documentType: true,
      userId: true,
    },
    with: {
      docProp: {
        columns: {
          documentId: true, // Ensure we get the document ID
        },
      },
    },
  });
  if (!record) {
    throw new Error('Email ID not found for the document');
  }
  const { emailId, attachmentId, documentType, docProp, userId } = record;
  const documentId =
    documentType === 'email' || documentType === 'attachment'
      ? documentIdFromProps
      : (docProp?.documentId ?? documentIdFromProps);

  let notes: Array<{ policyBasis: string[]; tags: string[]; note: string }>;
  if (Array.isArray(notesFromProps)) {
    notes = notesFromProps.map((note) =>
      typeof note === 'string'
        ? {
          policyBasis: [],
          tags: [],
          note,
        }
        : {
          policyBasis: note.policyBasis || [],
          tags: note.tags || [],
          note: note.note,
        },
    );
  } else if (typeof notesFromProps === 'string') {
    notes = [
      {
        policyBasis: [],
        tags: [],
        note: notesFromProps,
      },
    ];
  } else {
    notes = [notesFromProps];
  }

  // iterate through records, assinging id's and building insert records
  const inputRecords = notes.map(({ policyBasis, tags, note }) => {
    const propertyId = newUuid();
    const createdOn = new Date(Date.now()).toISOString();
    const documentRecord = {
      documentPropertyId: propertyId,
      emailId,
      userId,
      attachmentId,
      documentType: 'note',
      content: note,
      createdOn,
    };
    const documentPropertyRecord: DocumentPropertyType = {
      propertyId,
      documentId,
      documentPropertyTypeId: EmailPropertyTypeTypeId.Note,
      createdOn,
      propertyValue: note,
      policyBasis,
      tags,
    };
    return {
      documentRecord,
      documentPropertyRecord,
    };
  });
  const normalizedNotes = inputRecords.map((r) => r.documentPropertyRecord);

  await db.transaction(async (tx) => {
    await tx
      .insert(documentUnits)
      .values(inputRecords.map((r) => r.documentRecord));
    await tx.insert(documentProperty).values(normalizedNotes);
  });

  return Array.isArray(notesFromProps)
    ? (normalizedNotes as unknown as AddNoteRetVal<TNotes>)
    : (normalizedNotes[0] as unknown as AddNoteRetVal<TNotes>);
};
