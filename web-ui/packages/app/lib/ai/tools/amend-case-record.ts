import { LoggedError } from '@/lib/react-util/errors/logged-error';
import {
  Amendment,
  AmendmentResult,
  CaseFileAmendment,
  ResponsiveActionAssociation,
  ToolCallbackResult,
} from './types';
import {
  resolveCaseFileId,
  toolCallbackArrayResultSchemaFactory,
} from './utility';
import {
  callToActionDetails,
  callToActionDetailsCallToActionResponse,
  callToActionResponseDetails,
  documentProperty,
  documentUnits,
  keyPointsDetails,
  violationDetails,
} from '@/drizzle/schema';
import { eq } from 'drizzle-orm';
import { log } from '@compliance-theater/lib-logger';
import { toolCallbackResultFactory } from './utility';
import { newUuid } from '@compliance-theater/lib-typescript';
import { EmailPropertyTypeTypeId } from '@/data-models/api/email-properties/property-type';
import {
  drizDb,
  CallToActionResponsiveActionLinkType,
  DbTransactionType,
  addDocumentRelations,
  addNotesToDocument,
} from '@/lib/drizzle-db';
import { appMeters } from '@/lib/site-util/metrics';
import { CaseFileAmendmentShape } from './schemas/caseFileAmendmentShape';
import { AmendmentResultShape } from './schemas/amendment-result-schema';

// OpenTelemetry Metrics for AmendCaseRecord Tool
const amendCaseRecordCounter = appMeters.createCounter(
  'ai_tool_amend_case_record_total',
  {
    description: 'Total number of case record amendment operations',
    unit: '1',
  },
);

const amendCaseRecordDurationHistogram = appMeters.createHistogram(
  'ai_tool_amend_case_record_duration_ms',
  {
    description: 'Duration of case record amendment operations',
    unit: 'ms',
  },
);

const amendmentRecordsHistogram = appMeters.createHistogram(
  'ai_tool_amendment_records_count',
  {
    description: 'Number of records updated/inserted per amendment operation',
    unit: '1',
  },
);

const amendmentErrorCounter = appMeters.createCounter(
  'ai_tool_amend_case_record_errors_total',
  {
    description: 'Total number of case record amendment errors',
    unit: '1',
  },
);

/**
 * Updates the main record in the database based on the provided document type and amendment details.
 *
 * @param tx - The database transaction object.
 * @param du - The document unit containing the document type and property ID.
 * @param details - The amendment details including ratings, reasons, and arrays for updated and failed records.
 * @returns A promise that resolves when the update is complete.
 * @example
 * await updateMainRecord(tx, { documentType: 'cta', documentPropertyId: '123' }, {
 *   severityRating: 5,
 *   updated: [],
 *   failed: []
 * });
 */
const updateMainRecord = async (
  tx: DbTransactionType,
  du: { documentPropertyId: string | null; documentType: string | null },
  {
    severityRating,
    severityReasons,
    complianceRating,
    complianceReasons,
    completionRating,
    completionReasons,
    sentimentRating,
    sentimentReasons,
    chapter13Rating,
    chapter13Reasons,
    titleIXRating,
    titleIXReasons,
    updated,
    failed,
  }: Partial<CaseFileAmendment> & {
    updated: Array<Amendment>;
    failed: Array<Amendment & { error: string }>;
  },
): Promise<void> => {
  if (
    !(
      severityRating ??
      severityReasons?.length ??
      complianceRating ??
      complianceReasons?.length ??
      completionRating ??
      completionReasons?.length ??
      sentimentRating ??
      sentimentReasons?.length ??
      chapter13Rating ??
      chapter13Reasons?.length ??
      titleIXRating ??
      titleIXReasons?.length
    )
  ) {
    // nothing to do
    return;
  }

  switch (du.documentType) {
    case 'cta':
      await tx
        .update(callToActionDetails)
        .set({
          ...(severityRating !== undefined ? { severity: severityRating } : {}),
          ...(severityReasons !== undefined
            ? { severityReason: severityReasons }
            : {}),
          ...(sentimentRating !== undefined
            ? { sentiment: sentimentRating }
            : {}),
          ...(sentimentReasons !== undefined ? { sentimentReasons } : {}),
          ...(complianceRating !== undefined ? { complianceRating } : {}),
          ...(complianceReasons !== undefined
            ? { complianceRatingReasons: complianceReasons }
            : {}),
        })
        .where(eq(callToActionDetails.propertyId, du.documentPropertyId!))
        .execute();
      break;
    case 'cta_response':
      await tx
        .update(callToActionResponseDetails)
        .set({
          ...(complianceRating ? { complianceRating } : {}),
          ...(severityRating ? { severity: severityRating } : {}),
          ...(severityReasons?.length
            ? { severityReason: severityReasons }
            : {}),
          ...(sentimentRating ? { sentiment: sentimentRating } : {}),
          ...(sentimentReasons?.length ? { sentimentReasons } : {}),
        })
        .where(
          eq(callToActionResponseDetails.propertyId, du.documentPropertyId!),
        )
        .execute();
      break;
    case 'key_point':
      await tx
        .update(keyPointsDetails)
        .set({
          ...(complianceRating ? { compliance: complianceRating } : {}),
          ...(complianceReasons?.length ? { complianceReasons } : {}),
          ...(severityRating ? { severityRanking: severityRating } : {}),
          ...(severityReasons?.length
            ? { severityReason: severityReasons }
            : {}),
        })
        .where(eq(keyPointsDetails.propertyId, du.documentPropertyId!))
        .execute();
      break;
    case 'compliance':
      await tx
        .update(violationDetails)
        .set({
          ...(severityRating ? { severityLevel: severityRating } : {}),
          ...(severityReasons?.length ? { severityReasons } : {}),
          ...(titleIXRating ? { titleIxRelevancy: titleIXRating } : {}),
          ...(chapter13Rating ? { chapt13Relevancy: chapter13Rating } : {}),
        })
        .where(eq(violationDetails.propertyId, du.documentPropertyId!))
        .execute();
      break;
    default:
      log((l) =>
        l.warn(
          'Attempted to update main record for unsupported document type',
          {
            documentType: du.documentType,
          },
        ),
      );
      failed.push({
        id: du.documentPropertyId!,
        error: 'Unsupported document type',
        changes: {
          severityRating,
          severityReasons,
          complianceRating,
          complianceReasons,
          completionRating,
          completionReasons,
          sentimentRating,
          sentimentReasons,
          chapter13Rating,
          chapter13Reasons,
          titleIXRating,
          titleIXReasons,
        },
      });
      tx.rollback();
      return;
  }
  updated.push({
    id: du.documentPropertyId!,
    changes: {
      severityRating,
      severityReasons,
      complianceRating,
      complianceReasons,
      completionRating,
      completionReasons,
      sentimentRating,
      sentimentReasons,
      chapter13Rating,
      chapter13Reasons,
      titleIXRating,
      titleIXReasons,
    },
  });
};

/**
 * Adds notes to the database for a specific target document.
 *
 * @param params - An object containing the transaction, notes, target document, and arrays for inserted and failed records.
 * @returns A promise that resolves when the notes are added.
 * @example
 * await addNotes({
 *   tx,
 *   notes: ['Note 1', 'Note 2'],
 *   target: { unitId: 1, emailId: 'abc' },
 *   insertedRecords: [],
 *   failedRecords: []
 * });
 */
const addNotes = async ({
  tx,
  notes: notesFromProps,
  target: { unitId },
  insertedRecords,
  failedRecords,
}: {
  tx: DbTransactionType;
  notes?: Array<string>;
  target: { unitId: number; emailId: string | null };
  insertedRecords: Array<Amendment>;
  failedRecords: Array<Amendment & { error: string }>;
}) => {
  if (notesFromProps?.length) {
    try {
      const notes = await addNotesToDocument({
        db: tx,
        documentId: unitId,
        notes: notesFromProps,
      });
      insertedRecords.push(
        ...notes.map((note) => ({
          id: note.propertyId,
          changes: { notes: [note.propertyValue!] },
        })),
      );
    } catch (error) {
      const le = LoggedError.isTurtlesAllTheWayDownBaby(error, {
        log: true,
        source: 'amendCaseRecord:addNotes',
        data: { notesFromProps, unitId },
      });
      failedRecords.push(
        ...notesFromProps.map((note) => ({
          id: note,
          error: le.message ?? 'Failed to insert note',
          changes: { notes: [note] },
        })),
      );
      tx.rollback();
    }
  }
};

/**
 * Adds violations to the database for a specific target document.
 *
 * @param params - An object containing the transaction, violations, target document, and arrays for inserted and failed records.
 * @returns A promise that resolves when the violations are added.
 * @example
 * await addViolations({
 *   tx,
 *   violations: [{ violationType: 'Type A', severityLevel: 3 }],
 *   target: { unitId: 1, emailId: 'abc' },
 *   insertedRecords: [],
 *   failedRecords: []
 * });
 */
export const addViolations = async ({
  tx,
  violations,
  insertedRecords,
  failedRecords,
  target: { unitId: emailDocumentId, emailId },
}: Omit<CaseFileAmendment, 'targetCaseFileId' | 'explanation'> & {
  tx: DbTransactionType;
  target: { unitId: number; emailId: string | null };
  insertedRecords: Array<Amendment>;
  failedRecords: Array<Amendment & { error: string }>;
}): Promise<void> => {
  if (violations?.length) {
    const violationRecords = violations.map(
      ({
        violationType,
        severityLevel,
        severityReasons,
        violationReasons,
        titleIxRelevancy,
        chapt13Relevancy,
        ferpaRelevancy,
        otherRelevancy,
      }) => {
        return {
          propertyId: newUuid(),
          emailDocumentId,
          violationType,
          severityLevel,
          severityReasons: severityReasons ?? [],
          violationReasons,
          titleIxRelevancy: titleIxRelevancy ?? 0,
          chapt13Relevancy: chapt13Relevancy ?? 0,
          ferpaRelevancy: ferpaRelevancy ?? 0,
          otherRelevancy: otherRelevancy ?? 0,
        };
      },
    );


    try {
      // first extract user id associated with target document
      const targetDocumentUserId = (await tx
        .query
        .documentUnits
        .findFirst({
          where: (documentUnits, { eq }) => eq(documentUnits.unitId, emailDocumentId),
          columns: {
            userId: true,
          }
        }).then(x => x?.userId));
      if (!targetDocumentUserId) {
        throw new Error('Target document user id not found');
      }
      await tx
        .insert(documentUnits)
        .values(
          violationRecords.map(({ violationType, propertyId }) => ({
            emailId,
            userId: targetDocumentUserId,
            documentType: 'compliance',
            createdOn: new Date(Date.now()).toISOString(),
            content: violationType,
            documentPropertyId: propertyId,
          })),
        )
        .execute();

      await tx
        .insert(documentProperty)
        .values(
          violationRecords.map((v) => ({
            propertyId: v.propertyId,
            documentId: v.emailDocumentId,
            severityLevel: v.severityLevel,
            severityReason: v.severityReasons,
            documentPropertyTypeId: EmailPropertyTypeTypeId.ViolationDetails,
            createdOn: new Date(Date.now()).toISOString(),
            propertyValue: v.violationType,
          })),
        )
        .execute();
      await tx.insert(violationDetails).values(violationRecords).execute();
      insertedRecords.push(
        ...violationRecords.map((record) => ({
          id: record.propertyId,
          changes: { violations: [record] },
        })),
      );
    } catch (error) {
      const le = LoggedError.isTurtlesAllTheWayDownBaby(error, {
        log: true,
        source: 'amendCaseRecord:processViolations',
        data: { violations },
      });
      failedRecords.push(
        ...violationRecords.map((record) => ({
          id: record.propertyId,
          error: le.message ?? 'Failed to insert violation',
          changes: { violations: [record] },
        })),
      );
      tx.rollback();
    }
  }
};

/**
 * Associates responsive actions with a CTA response document.
 *
 * @param params - An object containing the transaction, responsive actions, and target document details.
 * @returns A promise that resolves when the associations are made.
 * @throws An error if the document type is not a CTA response or if the document property ID is missing.
 * @example
 * await associatResponsiveAction({
 *   tx,
 *   associateResponsiveAction: [{ relatedCtaDocumentId: 1 }],
 *   target: { documentType: 'cta_response', documentPropertyId: '123' }
 * });
 */
const associateResponsiveActions = async ({
  tx,
  associateResponsiveAction,
  target: { documentType, documentPropertyId },
}: {
  tx: DbTransactionType;
  target: {
    unitId: number;
    documentType: string | null;
    documentPropertyId: string | null;
  };
  associateResponsiveAction: Array<ResponsiveActionAssociation> | undefined;
}) => {
  // See if we can early-exit
  if (!associateResponsiveAction?.length) {
    return;
  }
  // Verify we are dealing with a valid responsive action
  if (documentType !== 'cta_response') {
    throw new Error(
      'The source document id must be a CTA Response to associate with a CTA.',
    );
  }
  if (!documentPropertyId) {
    throw new Error(
      'The source document id must have a document property ID to associate with a CTA.',
    );
  }

  const targetActions = (
    await tx.query.documentUnits.findMany({
      where: (documentUnits, { inArray, eq, and }) =>
        and(
          inArray(
            documentUnits.unitId,
            associateResponsiveAction.map((m) => m.relatedCtaDocumentId),
          ),
          eq(documentUnits.documentType, 'cta'),
        ),
      with: {
        docProp: {
          columns: {},
          with: {
            cta: {
              columns: {},
              with: {
                responses: {
                  columns: {},
                  with: {
                    ctaResponse: {
                      columns: {
                        propertyId: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    })
  ).filter((v) =>
    (
      v.docProp?.cta?.responses?.map((r) => r.ctaResponse?.propertyId ?? 0) ??
      []
    ).includes(documentPropertyId),
  );
  if (!targetActions || targetActions.length === 0) {
    throw new Error(
      'All target documents must refer to a call to action record.',
    );
  }
  // match up actual found records with incoming requests
  const records = associateResponsiveAction
    .map((ra) => {
      const cta = targetActions.find(
        (ta) => ta.unitId === ra.relatedCtaDocumentId,
      );
      if (!cta) {
        // I know, ick, but we filter it right away
        return undefined as unknown as CallToActionResponsiveActionLinkType;
      }
      return {
        callToActionId: cta.documentPropertyId!,
        callToActionResponseId: documentPropertyId!,
        complianceChapter13: ra.complianceChapter13,
        complianceChapter13Reasons: ra.complianceChapter13Reasons,
        completionPercentage: ra.completionPercentage,
        completionPercentageReasons: ra.completionReasons,
      } as CallToActionResponsiveActionLinkType;
    })
    .filter(Boolean);
  // Finally, insert the records
  await tx
    .insert(callToActionDetailsCallToActionResponse)
    .values(records)
    .execute();
};

/**
 * Relates documents by adding relationships between a source document and target documents.
 *
 * @param params - An object containing the transaction, target document, inserted records array, and related documents to add.
 * @returns A promise that resolves when the relationships are added.
 * @example
 * await relateDocuments({
 *   tx,
 *   target: { unitId: 1, emailId: 'abc' },
 *   insertedRecords: [],
 *   addRelatedDocuments: [{ relatedToDocumentId: 2, relationshipType: 'typeA' }]
 * });
 */
const relateDocuments = async ({
  tx,
  target: { unitId },
  insertedRecords,
  addRelatedDocuments,
}: {
  tx: DbTransactionType;
  insertedRecords: Array<Amendment>;
  target: { unitId: number; emailId: string | null };
  addRelatedDocuments?: Array<{
    relatedToDocumentId: number;
    relationshipType: string | number;
  }>;
}): Promise<void> => {
  if (!addRelatedDocuments || !addRelatedDocuments.length) {
    return;
  }
  // For our puposes, if we did not throw we can assume they were all
  // added.  It's poissble we haev dupes or some relastions alraedy existed,
  // but the model doesn't really care, it just needs to know they are there now.
  const records = await addDocumentRelations({
    db: tx,
    addDocumentRelations: addRelatedDocuments.map(
      ({ relatedToDocumentId, relationshipType }) => ({
        sourceDocumentId: unitId,
        targetDocumentId: relatedToDocumentId,
        relationshipReasonId: relationshipType,
      }),
    ),
  });
  records.forEach(
    ({ targetDocumentId, sourceDocumentId, relationshipReasonId }) => {
      insertedRecords.push({
        id: `${targetDocumentId}-${sourceDocumentId}-${relationshipReasonId}`,
        changes: {
          addRelatedDocuments: [
            {
              relatedToDocumentId: targetDocumentId,
              relationshipType: String(relationshipReasonId),
            },
          ],
        },
      });
    },
  );
};

/**
 * Amends a case record by applying updates, adding notes, violations, and related documents.
 *
 * @param amendment - The case file amendment details including target case file ID, notes, violations, and related documents.
 * @returns A promise that resolves with the result of the amendment process.
 * @example
 * const result = await amendCaseRecord({
 *   targetcase_file_id: 1,
 *   notes: ['Note 1'],
 *   violations: [{ violationType: 'Type A', severityLevel: 3 }],
 *   explanation: 'Reason for amendment',
 *   addRelatedDocuments: [{ relatedToDocumentId: 2, relationshipType: 'typeA' }]
 * });
 */
export const amendCaseRecord = async ({
  update: {
    targetCaseFileId,
    notes,
    violations,
    explanation,
    addRelatedDocuments,
    associateResponsiveAction,
    ...props
  },
}: {
  update: CaseFileAmendment;
}): Promise<ToolCallbackResult<AmendmentResult>> => {
  const startTime = Date.now();
  const updatedRecords = [] as Array<Amendment>;
  const insertedRecords = [] as Array<Amendment>;
  const failedRecords = [] as Array<Amendment & { error: string }>;
  let message: string | undefined;

  // Record basic metrics attributes
  const attributes = {
    has_notes: Boolean(notes?.length),
    has_violations: Boolean(violations?.length),
    has_related_documents: Boolean(addRelatedDocuments?.length),
    has_responsive_actions: Boolean(associateResponsiveAction?.length),
  };

  if (!explanation || explanation.trim().length === 0) {
    // Record error metrics
    amendmentErrorCounter.add(1, {
      ...attributes,
      error_type: 'missing_explanation',
    });

    amendCaseRecordDurationHistogram.record(Date.now() - startTime, {
      ...attributes,
      status: 'error',
    });

    return toolCallbackResultFactory<AmendmentResult>(
      new Error('Explanation is required'),
    );
  }

  try {
    const targetDocumentId = await resolveCaseFileId(targetCaseFileId);
    if (!targetDocumentId) {
      // Record error metrics
      amendmentErrorCounter.add(1, {
        ...attributes,
        error_type: 'target_not_found',
      });

      amendCaseRecordDurationHistogram.record(Date.now() - startTime, {
        ...attributes,
        status: 'error',
      });

      return toolCallbackResultFactory<AmendmentResult>(
        new Error('Target case file ID not found'),
      );
    }

    const target = await drizDb().query.documentUnits.findFirst({
      where: (documentUnits, { eq }) =>
        eq(documentUnits.unitId, targetDocumentId),
      columns: {
        content: false,
      },
      with: {
        docProp: {},
      },
    });
    if (target) {
      await drizDb().transaction(async (tx) => {
        // NOTE: Technically I could run these in parallel, but I want to ensure
        // but lest have some success with it as-is first.
        // Apply updates to the main record
        await updateMainRecord(tx, target, {
          ...props,
          updated: updatedRecords,
          failed: failedRecords,
        });
        // Handle notes
        await addNotes({ tx, notes, target, insertedRecords, failedRecords });
        // Handle violations
        await addViolations({
          tx,
          violations,
          target,
          insertedRecords,
          failedRecords,
        });
        // Related documents
        await relateDocuments({
          tx,
          insertedRecords,
          target,
          addRelatedDocuments: addRelatedDocuments,
        });
        // Responsive actions
        await associateResponsiveActions({
          tx,
          target,
          associateResponsiveAction,
        });
        // Reason
        await addNotesToDocument({
          db: tx,
          documentId: target.unitId,
          notes: [
            `${explanation}\n\nUpdated values: ${JSON.stringify(updatedRecords)}\nInserted values: ${JSON.stringify(insertedRecords)}`,
          ],
        });
      });
    } else {
      throw new Error('Target document not found', {
        cause: targetDocumentId,
      });
    }
  } catch (error) {
    const duration = Date.now() - startTime;

    // Record error metrics
    amendmentErrorCounter.add(1, {
      ...attributes,
      error_type: 'transaction_error',
    });

    amendCaseRecordDurationHistogram.record(duration, {
      ...attributes,
      status: 'error',
    });

    const le = LoggedError.isTurtlesAllTheWayDownBaby(error, {
      log: true,
      source: 'amendCaseRecord',
    });
    message = `An error occurred ammending the case record; no updates were committed.  Details: ${le.message}`;
  }

  const duration = Date.now() - startTime;
  const totalRecords = updatedRecords.length + insertedRecords.length;
  const hasFailures = failedRecords.length > 0;

  // Record success metrics
  amendCaseRecordCounter.add(1, {
    ...attributes,
    status: hasFailures ? 'partial_failure' : 'success',
  });

  amendCaseRecordDurationHistogram.record(duration, {
    ...attributes,
    status: hasFailures ? 'partial_failure' : 'success',
  });

  amendmentRecordsHistogram.record(totalRecords, {
    ...attributes,
    operation_type: 'total_records',
  });

  amendmentRecordsHistogram.record(updatedRecords.length, {
    ...attributes,
    operation_type: 'updated_records',
  });

  amendmentRecordsHistogram.record(insertedRecords.length, {
    ...attributes,
    operation_type: 'inserted_records',
  });

  if (hasFailures) {
    amendmentRecordsHistogram.record(failedRecords.length, {
      ...attributes,
      operation_type: 'failed_records',
    });

    message =
      message ??
      'We were unable to successfully amend the case record; no updates were committed.';
  }

  return toolCallbackResultFactory({
    message: message ?? 'All requested updates were successfully applied.',
    UpdatedRecords: updatedRecords,
    InsertedRecords: insertedRecords,
    FailedRecords: failedRecords,
  });
};
export const amendCaseRecordConfig = {
  description:
    'This tool supports updating values within existing case file documents.  It provides the following capabilities:\n' +
    '  - Adding a note to the file.\n' +
    '  - Associating existing call to action and call to action response files.\n' +
    '  - Adding a violation report to the case file.\n' +
    '  - Creating relationships between case file documents.\n' +
    '  - Updating select fields on extracted key points, notes, calls to action, responsive actions, or other relevant information.\n\n' +
    'Must be used with caution, as it can modify existing case file documents; Write access required.',
  inputSchema: {
    update: CaseFileAmendmentShape,
  },
  outputSchema: toolCallbackArrayResultSchemaFactory(AmendmentResultShape),
  annotations: {
    title: 'Amend Case File Document',
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
} as const;
