import { relations } from "drizzle-orm/relations";
import { callToActionDetails, callToActionExpectedResponse, callToActionResponseDetails, emails, documentUnits, emailAttachments, documentProperty, emailPropertyType, documentUnitAnalysisStageAudit, analysisStage, users, chatHistory, accounts, sessions, sessionsExt, contacts, policiesStatutes, emailPropertyCategory, stagingMessage, legalReferences, violationDetails, keyPointsDetails, complianceScoresDetails, emailSentimentAnalysisDetails, policyTypes, callToActionCategory, documentPropertyCallToActionCategory, emailRecipients, documentPropertyRelatedDocument, documentPropertyRelationReason, documentUnitEmbeddings, documentUnitAnalysisFunctionAudit, callToActionDetailsCallToActionResponse, stagingAttachment } from "./schema";

export const callToActionExpectedResponseRelations = relations(callToActionExpectedResponse, ({one}) => ({
	callToActionDetail: one(callToActionDetails, {
		fields: [callToActionExpectedResponse.callToActionId],
		references: [callToActionDetails.propertyId]
	}),
	callToActionResponseDetail: one(callToActionResponseDetails, {
		fields: [callToActionExpectedResponse.callToActionResponseDetailId],
		references: [callToActionResponseDetails.propertyId]
	}),
}));

export const callToActionDetailsRelations = relations(callToActionDetails, ({one, many}) => ({
	callToActionExpectedResponses: many(callToActionExpectedResponse),
	violationDetails: many(violationDetails),
	documentProperty: one(documentProperty, {
		fields: [callToActionDetails.propertyId],
		references: [documentProperty.propertyId]
	}),
	documentPropertyCallToActionCategories: many(documentPropertyCallToActionCategory),
	callToActionDetailsCallToActionResponses: many(callToActionDetailsCallToActionResponse),
}));

export const callToActionResponseDetailsRelations = relations(callToActionResponseDetails, ({one, many}) => ({
	callToActionExpectedResponses: many(callToActionExpectedResponse),
	documentProperty: one(documentProperty, {
		fields: [callToActionResponseDetails.propertyId],
		references: [documentProperty.propertyId]
	}),
	callToActionDetailsCallToActionResponses: many(callToActionDetailsCallToActionResponse),
}));

export const documentUnitsRelations = relations(documentUnits, ({one, many}) => ({
	email: one(emails, {
		fields: [documentUnits.emailId],
		references: [emails.emailId]
	}),
	emailAttachment: one(emailAttachments, {
		fields: [documentUnits.attachmentId],
		references: [emailAttachments.attachmentId]
	}),
	documentProperty: one(documentProperty, {
		fields: [documentUnits.documentPropertyId],
		references: [documentProperty.propertyId],
		relationName: "documentUnits_documentPropertyId_documentProperty_propertyId"
	}),
	documentProperties: many(documentProperty, {
		relationName: "documentProperty_documentId_documentUnits_unitId"
	}),
	documentUnitAnalysisStageAudits: many(documentUnitAnalysisStageAudit),
	documentPropertyRelatedDocuments: many(documentPropertyRelatedDocument),
	documentUnitEmbeddings: many(documentUnitEmbeddings),
}));

export const emailsRelations = relations(emails, ({one, many}) => ({
	documentUnits: many(documentUnits),
	contact: one(contacts, {
		fields: [emails.senderId],
		references: [contacts.contactId]
	}),
	email: one(emails, {
		fields: [emails.parentId],
		references: [emails.emailId],
		relationName: "emails_parentId_emails_emailId"
	}),
	emails: many(emails, {
		relationName: "emails_parentId_emails_emailId"
	}),
	emailAttachments: many(emailAttachments),
	emailRecipients: many(emailRecipients),
}));

export const emailAttachmentsRelations = relations(emailAttachments, ({one, many}) => ({
	documentUnits: many(documentUnits),
	email: one(emails, {
		fields: [emailAttachments.emailId],
		references: [emails.emailId]
	}),
	policiesStatute: one(policiesStatutes, {
		fields: [emailAttachments.policyId],
		references: [policiesStatutes.policyId]
	}),
	violationDetails: many(violationDetails),
	complianceScoresDetails: many(complianceScoresDetails),
	emailSentimentAnalysisDetails: many(emailSentimentAnalysisDetails),
}));

export const documentPropertyRelations = relations(documentProperty, ({one, many}) => ({
	documentUnits: many(documentUnits, {
		relationName: "documentUnits_documentPropertyId_documentProperty_propertyId"
	}),
	emailPropertyType: one(emailPropertyType, {
		fields: [documentProperty.documentPropertyTypeId],
		references: [emailPropertyType.documentPropertyTypeId]
	}),
	documentUnit: one(documentUnits, {
		fields: [documentProperty.documentId],
		references: [documentUnits.unitId],
		relationName: "documentProperty_documentId_documentUnits_unitId"
	}),
	violationDetails: many(violationDetails),
	complianceScoresDetails_propertyId: many(complianceScoresDetails, {
		relationName: "complianceScoresDetails_propertyId_documentProperty_propertyId"
	}),
	complianceScoresDetails_actionPropertyId: many(complianceScoresDetails, {
		relationName: "complianceScoresDetails_actionPropertyId_documentProperty_propertyId"
	}),
	emailSentimentAnalysisDetails: many(emailSentimentAnalysisDetails),
	keyPointsDetails: many(keyPointsDetails),
	callToActionDetails: many(callToActionDetails),
	callToActionResponseDetails: many(callToActionResponseDetails),
	documentPropertyCallToActionCategories: many(documentPropertyCallToActionCategory),
	documentPropertyRelatedDocuments: many(documentPropertyRelatedDocument),
}));

export const emailPropertyTypeRelations = relations(emailPropertyType, ({one, many}) => ({
	documentProperties: many(documentProperty),
	emailPropertyCategory: one(emailPropertyCategory, {
		fields: [emailPropertyType.emailPropertyCategoryId],
		references: [emailPropertyCategory.emailPropertyCategoryId]
	}),
}));

export const documentUnitAnalysisStageAuditRelations = relations(documentUnitAnalysisStageAudit, ({one, many}) => ({
	documentUnit: one(documentUnits, {
		fields: [documentUnitAnalysisStageAudit.documentId],
		references: [documentUnits.unitId]
	}),
	analysisStage: one(analysisStage, {
		fields: [documentUnitAnalysisStageAudit.analysisStageId],
		references: [analysisStage.analysisStageId]
	}),
	documentUnitAnalysisFunctionAudits: many(documentUnitAnalysisFunctionAudit),
}));

export const analysisStageRelations = relations(analysisStage, ({many}) => ({
	documentUnitAnalysisStageAudits: many(documentUnitAnalysisStageAudit),
}));

export const chatHistoryRelations = relations(chatHistory, ({one}) => ({
	user: one(users, {
		fields: [chatHistory.userId],
		references: [users.id]
	}),
}));

export const usersRelations = relations(users, ({many}) => ({
	chatHistories: many(chatHistory),
	stagingMessages: many(stagingMessage),
}));

export const sessionsRelations = relations(sessions, ({one, many}) => ({
	account: one(accounts, {
		fields: [sessions.userId],
		references: [accounts.userId]
	}),
	sessionsExts: many(sessionsExt),
}));

export const accountsRelations = relations(accounts, ({many}) => ({
	sessions: many(sessions),
}));

export const sessionsExtRelations = relations(sessionsExt, ({one}) => ({
	session: one(sessions, {
		fields: [sessionsExt.sessionId],
		references: [sessions.id]
	}),
}));

export const contactsRelations = relations(contacts, ({many}) => ({
	emails: many(emails),
	emailRecipients: many(emailRecipients),
}));

export const policiesStatutesRelations = relations(policiesStatutes, ({one, many}) => ({
	emailAttachments: many(emailAttachments),
	legalReferences: many(legalReferences),
	policyType: one(policyTypes, {
		fields: [policiesStatutes.policyTypeId],
		references: [policyTypes.policyTypeId]
	}),
}));

export const emailPropertyCategoryRelations = relations(emailPropertyCategory, ({many}) => ({
	emailPropertyTypes: many(emailPropertyType),
}));

export const stagingMessageRelations = relations(stagingMessage, ({one, many}) => ({
	user: one(users, {
		fields: [stagingMessage.userId],
		references: [users.id]
	}),
	stagingAttachments: many(stagingAttachment),
}));

export const legalReferencesRelations = relations(legalReferences, ({one}) => ({
	policiesStatute: one(policiesStatutes, {
		fields: [legalReferences.policyId],
		references: [policiesStatutes.policyId]
	}),
}));

export const violationDetailsRelations = relations(violationDetails, ({one}) => ({
	callToActionDetail: one(callToActionDetails, {
		fields: [violationDetails.actionPropertyId],
		references: [callToActionDetails.propertyId]
	}),
	emailAttachment: one(emailAttachments, {
		fields: [violationDetails.attachmentId],
		references: [emailAttachments.attachmentId]
	}),
	keyPointsDetail: one(keyPointsDetails, {
		fields: [violationDetails.keyPointPropertyId],
		references: [keyPointsDetails.propertyId]
	}),
	documentProperty: one(documentProperty, {
		fields: [violationDetails.propertyId],
		references: [documentProperty.propertyId]
	}),
}));

export const keyPointsDetailsRelations = relations(keyPointsDetails, ({one, many}) => ({
	violationDetails: many(violationDetails),
	documentProperty: one(documentProperty, {
		fields: [keyPointsDetails.propertyId],
		references: [documentProperty.propertyId]
	}),
}));

export const complianceScoresDetailsRelations = relations(complianceScoresDetails, ({one}) => ({
	emailAttachment: one(emailAttachments, {
		fields: [complianceScoresDetails.attachmentId],
		references: [emailAttachments.attachmentId]
	}),
	documentProperty_propertyId: one(documentProperty, {
		fields: [complianceScoresDetails.propertyId],
		references: [documentProperty.propertyId],
		relationName: "complianceScoresDetails_propertyId_documentProperty_propertyId"
	}),
	documentProperty_actionPropertyId: one(documentProperty, {
		fields: [complianceScoresDetails.actionPropertyId],
		references: [documentProperty.propertyId],
		relationName: "complianceScoresDetails_actionPropertyId_documentProperty_propertyId"
	}),
}));

export const emailSentimentAnalysisDetailsRelations = relations(emailSentimentAnalysisDetails, ({one}) => ({
	emailAttachment: one(emailAttachments, {
		fields: [emailSentimentAnalysisDetails.attachmentId],
		references: [emailAttachments.attachmentId]
	}),
	documentProperty: one(documentProperty, {
		fields: [emailSentimentAnalysisDetails.propertyId],
		references: [documentProperty.propertyId]
	}),
}));

export const policyTypesRelations = relations(policyTypes, ({many}) => ({
	policiesStatutes: many(policiesStatutes),
}));

export const documentPropertyCallToActionCategoryRelations = relations(documentPropertyCallToActionCategory, ({one}) => ({
	callToActionCategory: one(callToActionCategory, {
		fields: [documentPropertyCallToActionCategory.ctaCategoryId],
		references: [callToActionCategory.ctaCategoryId]
	}),
	callToActionDetail: one(callToActionDetails, {
		fields: [documentPropertyCallToActionCategory.propertyId],
		references: [callToActionDetails.propertyId]
	}),
	documentProperty: one(documentProperty, {
		fields: [documentPropertyCallToActionCategory.propertyId],
		references: [documentProperty.propertyId]
	}),
}));

export const callToActionCategoryRelations = relations(callToActionCategory, ({many}) => ({
	documentPropertyCallToActionCategories: many(documentPropertyCallToActionCategory),
}));

export const emailRecipientsRelations = relations(emailRecipients, ({one}) => ({
	email: one(emails, {
		fields: [emailRecipients.emailId],
		references: [emails.emailId]
	}),
	contact: one(contacts, {
		fields: [emailRecipients.recipientId],
		references: [contacts.contactId]
	}),
}));

export const documentPropertyRelatedDocumentRelations = relations(documentPropertyRelatedDocument, ({one}) => ({
	documentUnit: one(documentUnits, {
		fields: [documentPropertyRelatedDocument.documentId],
		references: [documentUnits.unitId]
	}),
	documentProperty: one(documentProperty, {
		fields: [documentPropertyRelatedDocument.relatedPropertyId],
		references: [documentProperty.propertyId]
	}),
	documentPropertyRelationReason: one(documentPropertyRelationReason, {
		fields: [documentPropertyRelatedDocument.relationshipType],
		references: [documentPropertyRelationReason.relationReasonId]
	}),
}));

export const documentPropertyRelationReasonRelations = relations(documentPropertyRelationReason, ({many}) => ({
	documentPropertyRelatedDocuments: many(documentPropertyRelatedDocument),
}));

export const documentUnitEmbeddingsRelations = relations(documentUnitEmbeddings, ({one}) => ({
	documentUnit: one(documentUnits, {
		fields: [documentUnitEmbeddings.documentId],
		references: [documentUnits.unitId]
	}),
}));

export const documentUnitAnalysisFunctionAuditRelations = relations(documentUnitAnalysisFunctionAudit, ({one}) => ({
	documentUnitAnalysisStageAudit: one(documentUnitAnalysisStageAudit, {
		fields: [documentUnitAnalysisFunctionAudit.analysisAuditId],
		references: [documentUnitAnalysisStageAudit.analysisAuditId]
	}),
}));

export const callToActionDetailsCallToActionResponseRelations = relations(callToActionDetailsCallToActionResponse, ({one}) => ({
	callToActionDetail: one(callToActionDetails, {
		fields: [callToActionDetailsCallToActionResponse.callToActionId],
		references: [callToActionDetails.propertyId]
	}),
	callToActionResponseDetail: one(callToActionResponseDetails, {
		fields: [callToActionDetailsCallToActionResponse.callToActionResponseId],
		references: [callToActionResponseDetails.propertyId]
	}),
}));

export const stagingAttachmentRelations = relations(stagingAttachment, ({one}) => ({
	stagingMessage: one(stagingMessage, {
		fields: [stagingAttachment.stagingMessageId],
		references: [stagingMessage.id]
	}),
}));