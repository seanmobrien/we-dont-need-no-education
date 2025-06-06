import { LoggedError } from '@/lib/react-util';
import {
  Amendment,
  AmendmentResult,
  CaseFileAmendment,
  ToolCallbackResult,
} from './types';
import { db } from '@/lib/drizzle-db/connection';
import { resolveCaseFileId } from './utility';
import {
  callToActionDetails,
  callToActionResponseDetails,
  documentProperty,
  keyPointsDetails,
  violationDetails,
} from '@/drizzle/schema';
import { eq } from 'drizzle-orm';
import { log } from '@/lib/logger';
import { toolCallbackResultFactory } from './utility';
import { newUuid } from '@/lib/typescript';
import { EmailPropertyTypeTypeId } from '@/data-models/api/email-properties/property-type';

const updateMainRecord = async (
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
      await db
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
      await db
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
      await db
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

const addNotes = async ({
  notes: notesFromProps,
  target: { unitId },
  insertedRecords,
  failedRecords,
}: {
  notes?: Array<string>;
  target: { unitId: number };
  insertedRecords: Array<Amendment>;
  failedRecords: Array<Amendment & { error: string }>;
}) => {
  if (notesFromProps?.length) {
    const notes = notesFromProps
      .map((v) => v?.trim() ?? '')
      .filter((v) => v.length)
      .map((value) => ({
        propertyId: newUuid(),
        documentId: unitId,
        documentPropertyTypeId: EmailPropertyTypeTypeId.Note,
        createdOn: Date.now().toString(),
        propertyValue: value,
      }));
    try {
      await db.insert(documentProperty).values(notes).execute();
      insertedRecords.push(
        ...notes.map((note) => ({
          id: note.propertyId,
          changes: { notes: [note.propertyValue] },
        })),
      );
    } catch (error) {
      const le = LoggedError.isTurtlesAllTheWayDownBaby(error, {
        log: true,
        source: 'amendCaseRecord:addNotes',
        data: { notes, unitId },
      });
      failedRecords.push(
        ...notes.map((note) => ({
          id: note.propertyId,
          error: le.message ?? 'Failed to insert note',
          changes: { notes: [note.propertyValue] },
        })),
      );
    }
  }
};

export const addViolations = async ({
  violations,
  insertedRecords,
  failedRecords,
  target: { unitId: emailDocumentId },
}: Omit<CaseFileAmendment, 'targetCaseFileId' | 'explaination'> & {
  target: { unitId: number };
  insertedRecords: Array<Amendment>;
  failedRecords: Array<Amendment & { error: string }>;
}): Promise<void> => {
  if (violations?.length) {
    const violationRecords = violations.map(
      ({
        violationType,
        severityLevel,
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
          violationReasons,
          titleIxRelevancy,
          chapt13Relevancy,
          ferpaRelevancy,
          otherRelevancy,
        };
      },
    );

    try {
      await db.insert(violationDetails).values(violationRecords).execute();
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
    }
  }
};

export const amendCaseRecord = async ({
  targetCaseFileId,
  notes,
  violations,
  ...props
}: CaseFileAmendment): Promise<ToolCallbackResult<AmendmentResult>> => {
  const updatedRecords = [] as Array<Amendment>;
  const insertedRecords = [] as Array<Amendment>;
  const failedRecords = [] as Array<Amendment & { error: string }>;
  let message: string | undefined;
  try {
    const targetDocumentId = await resolveCaseFileId(targetCaseFileId);
    if (!targetDocumentId) {
      throw new Error('Target case file not found', {
        cause: targetCaseFileId,
      });
    }

    const target = await db.query.documentUnits.findFirst({
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
      updateMainRecord(target, {
        ...props,
        updated: updatedRecords,
        failed: failedRecords,
      });
      // Handle notes
      await addNotes({ notes, target, insertedRecords, failedRecords });
      // Handle violations
      await addViolations({
        violations,
        target,
        insertedRecords,
        failedRecords,
      });
    } else {
      throw new Error('Target document not found', {
        cause: targetDocumentId,
      });
    }
  } catch (error) {
    const le = LoggedError.isTurtlesAllTheWayDownBaby(error, {
      log: true,
      source: 'amendCaseRecord',
    });
    message = 'Failed to fully amend case record - ' + le.message;
  }
  return toolCallbackResultFactory({
    message: message ?? 'Amendment processed successfully',
    UpdatedRecords: updatedRecords,
    InsertedRecords: insertedRecords,
    FailedRecords: failedRecords,
  });
};
