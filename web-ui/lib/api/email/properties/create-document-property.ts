import { EmailPropertyTypeTypeId } from '@/data-models/api/email-properties/property-type';
import { isDocumentUnitType } from '@/data-models/api/document-unit';
import { documentProperty, documentUnits } from '@/drizzle/schema';
import { drizDb } from '@/lib/drizzle-db';
import { newUuid } from '@/lib/typescript';
import { log } from '@/lib/logger';
import { eq } from 'drizzle-orm';

export const mapPropertyTypeToDocumentType = (typeId: number): string => {
  switch (typeId) {
    case EmailPropertyTypeTypeId.Note:
      return 'note';
    case EmailPropertyTypeTypeId.ManualReview:
      return 'manual_review';
    case EmailPropertyTypeTypeId.CallToAction:
      return 'cta';
    case EmailPropertyTypeTypeId.CallToActionResponse:
      return 'cta_response';
    case EmailPropertyTypeTypeId.ComplianceScore:
      return 'compliance';
    case EmailPropertyTypeTypeId.ViolationDetails:
      return 'violation';
    case EmailPropertyTypeTypeId.SentimentAnalysis:
      return 'sentiment';
    case EmailPropertyTypeTypeId.KeyPoints:
      return 'key_point';
    default:
      log((l) => l.error(`Unknown document type for typeId: ${typeId}`));
      return 'unknown';
  }
};

export const createDocumentProperty = async ({
  data,
  emailId,
  attachmentId,
}: {
  data: typeof documentProperty.$inferInsert;
  emailId: string;
  attachmentId?: number;
}) => {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid data provided for document property creation');
  }
  if (!data.documentPropertyTypeId) {
    throw new Error('Document property type ID is required');
  }
  const documentType = mapPropertyTypeToDocumentType(
    data.documentPropertyTypeId,
  );
  if (!isDocumentUnitType(documentType)) {
    throw new Error(
      `Invalid document type for typeId: ${data.documentPropertyTypeId}`,
    );
  }
  if (!data.propertyId) {
    data.propertyId = newUuid();
  }
  // First, insert document property record
  await drizDb().insert(documentProperty).values(data).execute();
  // Then create document
  const [{ documentId }] = await drizDb()
    .insert(documentUnits)
    .values({
      documentPropertyId: data.propertyId,
      emailId,
      attachmentId,
      documentType,
      content: data.propertyValue,
    })
    .returning({ documentId: documentUnits.unitId });
  // Finally, update our record with the document ID
  await drizDb()
    .update(documentProperty)
    .set({ documentId })
    .where(eq(documentProperty.propertyId, data.propertyId))
    .execute();
  data.documentId = documentId;
  return data;
};
