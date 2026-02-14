import { EmailPropertyTypeTypeId } from '@/data-models/api/email-properties/property-type';
import { isDocumentUnitType } from '@/data-models/api/document-unit';
import { documentProperty, documentUnits } from '@compliance-theater/database/schema';
import { drizDb } from '@compliance-theater/database/orm';
import { newUuid } from '@compliance-theater/typescript';
import { log } from '@compliance-theater/logger';
import { eq } from 'drizzle-orm';
export const mapPropertyTypeToDocumentType = (typeId) => {
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
export const createDocumentProperty = async ({ data, emailId, attachmentId, userId: userIdFromProps, }) => {
    if (!data || typeof data !== 'object') {
        throw new Error('Invalid data provided for document property creation');
    }
    if (!data.documentPropertyTypeId) {
        throw new Error('Document property type ID is required');
    }
    const documentType = mapPropertyTypeToDocumentType(data.documentPropertyTypeId);
    if (!isDocumentUnitType(documentType)) {
        throw new Error(`Invalid document type for typeId: ${data.documentPropertyTypeId}`);
    }
    if (!data.propertyId) {
        data.propertyId = newUuid();
    }
    let userId;
    if (userIdFromProps) {
        userId = userIdFromProps;
    }
    else {
        const targetDocumentUserId = await drizDb()
            .query.documentUnits.findFirst({
            where: (documentUnits, { eq }) => eq(documentUnits.emailId, emailId),
            columns: {
                userId: true,
            },
        })
            .then((x) => x?.userId);
        if (!targetDocumentUserId) {
            throw new Error('Target document user id not found');
        }
        userId = targetDocumentUserId;
    }
    await drizDb().insert(documentProperty).values(data).execute();
    const [{ documentId }] = await drizDb()
        .insert(documentUnits)
        .values({
        documentPropertyId: data.propertyId,
        userId,
        emailId,
        attachmentId,
        documentType,
        content: data.propertyValue,
    })
        .returning({ documentId: documentUnits.unitId });
    await drizDb()
        .update(documentProperty)
        .set({ documentId })
        .where(eq(documentProperty.propertyId, data.propertyId))
        .execute();
    data.documentId = documentId;
    return data;
};
//# sourceMappingURL=create-document-property.js.map