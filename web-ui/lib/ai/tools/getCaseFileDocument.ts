import { db } from '@/lib/neondb/drizzle-db';
import { emailPropertyCategory } from '@/drizzle/schema';
import { toolCallbackResultFactory } from './utility';
import {
  DocumentIndexResourceToolResult,
  DocumentResource,
  DocumentResourceIndex,
  DocumentResourceToolResult,
  MultipleDocumentResourceToolResult,
} from './types';
import { LoggedError } from '@/lib/react-util';
import { log } from '@/lib/logger';
import { BinaryOperator } from 'drizzle-orm';

const caseFileDocumentShape = {
  columns: {
    unitId: true,
    attachmentId: true,
    documentPropertyId: true,
    documentType: true,
    emailId: true,
    content: true,
    createdOn: true,
  },
  with: {
    emailAttachment: {
      columns: {
        attachmentId: true,
        fileName: true,
        size: true,
        mimeType: true,
      },
    },
    documentProperty: {
      columns: {
        documentPropertyTypeId: true,
        createdOn: true,
        policyBasis: true,
        tags: true,
      },
      with: {
        emailPropertyType: {
          columns: {
            documentPropertyTypeId: true,
            propertyName: true,
          },
          with: {
            emailPropertyCategory: {
              columns: {
                emailPropertyCategoryId: true,
                description: true,
              },
            },
          },
        },
        callToActionDetails: {
          columns: {
            openedDate: true,
            closedDate: true,
            compliancyCloseDate: true,
            completionPercentage: true,
            complianceRating: true,
            complianceRatingReasons: true,
            inferred: true,
            complianceDateEnforceable: true,
            reasonableReasons: true,
            reasonableRequest: true,
            sentiment: true,
            sentimentReasons: true,
            severity: true,
            severityReason: true,
            titleIxApplicable: true,
            titleIxApplicableReasons: true,
            closureActions: true,
          },
        },
        callToActionResponseDetails: {},
      },
    },
    email: {
      with: {
        contact: {},
        emailRecipients: {
          with: {
            contact: {
              columns: {
                contactId: true,
                name: true,
                isDistrictStaff: true,
                email: true,
                roleDscr: true,
              },
            },
          },
        },
        emailAttachments: {
          columns: {
            attachmentId: true,
            fileName: true,
            size: true,
            mimeType: true,
          },
          with: {
            documentUnits: {
              columns: {
                unitId: true,
              },
            },
          },
        },
      },
    },
  },
};

const resolveCaseFileId = async (
  documentId: number | string,
): Promise<number | undefined> => {
  let parsedId: number | undefined;
  if (typeof documentId === 'string') {
    parsedId = parseInt(documentId, 10);
    if (isNaN(parsedId)) {
      parsedId = await db.query.documentUnits
        .findFirst({
          where: (du, { eq }) =>
            eq(du.emailId, documentId).append(eq(du.documentType, 'email')),
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

export const getCaseFileDocument = async ({
  caseFileId,
}: {
  caseFileId: number | string;
}): Promise<DocumentResourceToolResult> => {
  try {
    // If incoming documentId is a string, check to see if we were passed an email or property identifier.
    const parsedId = await resolveCaseFileId(caseFileId);
    if (!parsedId) {
      throw new Error(
        `Case File ID [${caseFileId}] could not be resolved to a valid document ID`,
      );
    }
    // If we made it this far we at least know we have a numeric documentId :)
    const document = await db.query.documentUnits.findFirst({
      where: (du, { eq }) => eq(du.unitId, parsedId),
      columns: {
        unitId: true,
        attachmentId: true,
        documentPropertyId: true,
        documentType: true,
        emailId: true,
        content: true,
        createdOn: true,
      },
      with: {
        ...caseFileDocumentShape.with,
      },
    });
    if (!document) {
      throw new Error(`Document with ID ${parsedId} not found`);
    }
    log((l) =>
      l.info(
        `getCaseFileDocument: Retrieved document with ID ${document.unitId}`,
        document,
      ),
    );
    return toolCallbackResultFactory<DocumentResource>(document);
  } catch (error) {
    return toolCallbackResultFactory<DocumentResource>(
      LoggedError.isTurtlesAllTheWayDownBaby(error, {
        log: true,
      }),
    );
  }
};

export const getMultipleCaseFileDocuments = async ({
  caseFileIds,
}: {
  caseFileIds: (number | string)[];
}): Promise<MultipleDocumentResourceToolResult> => {
  try {
    const validIds = (await Promise.all(caseFileIds.map(resolveCaseFileId)))
      .filter(Boolean)
      .map((id) => Number(id)); // Ensure all IDs are numbers
    if (validIds.length === 0) {
      throw new Error(
        `No valid Case File IDs could be resolved from the provided identifiers: ${caseFileIds.join(', ')}`,
      );
    }
    const documents = await db.query.documentUnits.findMany({
      where: (du, { inArray }) => inArray(du.unitId, validIds),
      ...caseFileDocumentShape,
    });
    log((l) =>
      l.info(
        `getMultipleCaseFileDocuments: Retrieved ${documents.length} documents`,
        documents,
      ),
    );
    return toolCallbackResultFactory<Array<DocumentResource>>(documents);
  } catch (error) {
    return toolCallbackResultFactory<Array<DocumentResource>>(
      LoggedError.isTurtlesAllTheWayDownBaby(error, {
        log: true,
      }),
    );
  }
};

/**
 * Maps an external document scope value into it's serialized equivalent.
 * @param type
 * @returns
 */
const mapDocumentType = (
  type: string,
):
  | 'email'
  | 'attachment'
  | 'key-point'
  | 'call-to-action'
  | 'responsive-action'
  | 'note' => {
  switch (type) {
    case 'email':
    case 'attachment':
      return type;
    case 'key_point':
      return 'key-point';
    case 'cta_response':
      return 'responsive-action';
    case 'cta':
      return 'call-to-action';
    default:
      return type as
        | 'email'
        | 'attachment'
        | 'key-point'
        | 'call-to-action'
        | 'responsive-action'
        | 'note';
  }
};
const mapToDocumentType = (type: string): string => {
  switch (type) {
    case 'key-point':
      return 'key_point';
    case 'responsive-action':
      return 'cta_response';
    case 'call-to-action':
      return 'cta';
    default:
      return type;
  }
};

export const getCaseFileDocumentIndex = async ({
  scope: scopeFromProps,
}: {
  scope?: Array<
    | 'email'
    | 'attachment'
    | 'core-document'
    | 'key-point'
    | 'call-to-action'
    | 'responsive-action'
    | 'note'
  >;
}): Promise<DocumentIndexResourceToolResult> => {
  try {
    const scope = (scopeFromProps ?? []).map((s) =>
      mapToDocumentType(String(s)),
    );
    const index = await db.query.documentUnits
      .findMany({
        ...(scope.length > 0
          ? { where: (du, { inArray }) => inArray(du.documentType, scope) }
          : {}),
        columns: {
          unitId: true,
          emailId: true,
          attachmentId: true,
          documentPropertyId: true,
          documentType: true,
          createdOn: true,
        },
      })
      .then((documents) =>
        documents.map((doc) => ({
          ...doc,
          createdOn: new Date(doc.createdOn ?? Date.now()),
          documentType: mapDocumentType(doc.documentType ?? ''),
        })),
      );
    return toolCallbackResultFactory(index);
  } catch (error) {
    return toolCallbackResultFactory<Array<DocumentResourceIndex>>(
      LoggedError.isTurtlesAllTheWayDownBaby(error, {
        log: true,
        message: 'Error retrieving case file document index',
        data: { scope: scopeFromProps },
      }),
    );
  }
};
