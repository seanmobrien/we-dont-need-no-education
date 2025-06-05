import { db } from '@/lib/neondb/drizzle-db';
import { resolveCaseFileId, toolCallbackResultFactory } from './utility';
import {
  DocumentIndexResourceToolResult,
  DocumentResource,
  DocumentResourceIndex,
  DocumentResourceToolResult,
  MultipleDocumentResourceToolResult,
} from './types';
import { LoggedError } from '@/lib/react-util';
import { log } from '@/lib/logger';
import { FirstParameter } from '@/lib/typescript';
import { sql } from 'drizzle-orm';

const documentPropertyShape: FirstParameter<
  (typeof db)['query']['documentProperty']['findFirst']
> = {
  columns: {
    documentPropertyTypeId: true,
    createdOn: true,
    policyBasis: true,
    tags: true,
    propertyValue: true,
  },
  with: {
    documentUnit: {
      columns: {
        content: false,
        createdOn: false,
        embeddingModel: false,
        embeddedOn: false,
      },
      with: {
        docRel_targetDoc: {
          columns: {
            targetDocumentId: true,
            relationshipReasonId: true,
          },
          extras: {
            description:
              sql`(SELECT description FROM document_relationship_reason WHERE relation_reason_id = relationship_reason_id)`.as(
                'description',
              ),
          },
        },
      },
    },
    emailPropertyType: {
      columns: {
        documentPropertyTypeId: true,
        propertyName: true,
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
        reasonableReasons: false,
        reasonableRequest: false,
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
    keyPointsDetails: {
      columns: {
        relevance: true,
        compliance: true,
        severityRanking: true,
        inferred: true,
      },
    },
  },
};

const caseFileDocumentShape: FirstParameter<
  (typeof db)['query']['documentUnits']['findFirst']
> = {
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
    docRel_sourceDocId: {
      columns: {
        targetDocumentId: true,
        relationshipReasonId: true,
      },
      extras: {
        description:
          sql`(SELECT description FROM document_relationship_reason WHERE relation_reason_id = relationship_reason_id)`.as(
            'description',
          ),
      },
    },
    emailAttachment: {
      columns: {
        attachmentId: false,
        fileName: true,
        size: true,
        mimeType: true,
        extractedText: false,
      },
    },
    documentProperty: {
      ...documentPropertyShape,
      columns: {
        ...documentPropertyShape.columns,
        propertyValue: false,
      },
    },
    documentProperties: {
      ...documentPropertyShape,
      columns: {
        ...documentPropertyShape.columns,
        propertyId: true,
      },
      where: (dp, { inArray }) =>
        inArray(dp.documentPropertyTypeId, [
          4, // EmailPropertyTypeTypeId.CallToAction
          5, // EmailPropertyTypeTypeId.CallToActionResponse,
          6, //EmailPropertyTypeTypeId.ComplianceScore,
          7, //EmailPropertyTypeTypeId.ViolationDetails,
          8, //EmailPropertyTypeTypeId.SentimentAnalysis,
          9, //EmailPropertyTypeTypeId.KeyPoints,
          102, //EmailPropertyTypeTypeId.Note,
          1000, //  EmailPropertyTypeTypeId.ManualReview,
        ]),
    },
    email: {
      columns: {
        importedFromId: false,
        senderId: false,
        emailContents: false,
      },
      with: {
        contact: {
          columns: {
            contactId: false,
          },
        },
        emailRecipients: {
          columns: {
            recipientId: false,
            emailId: false,
          },
          with: {
            contact: {
              columns: {
                contactId: false,
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
            attachmentId: false,
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
      ...caseFileDocumentShape,
    });
    if (!document) {
      throw new Error(
        `There is no document matching ID ${parsedId} - not found`,
      );
    }
    log((l) =>
      l.info(
        `getCaseFileDocument: Retrieved document with ID ${document.unitId}`,
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
