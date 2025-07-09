import { relations } from 'drizzle-orm/relations';
import {
  callToActionDetails,
  callToActionExpectedResponse,
  callToActionResponseDetails,
  emails,
  documentUnits,
  emailAttachments,
  documentProperty,
  emailPropertyType,
  documentUnitAnalysisStageAudit,
  analysisStage,
  users,
  chatHistory,
  messageStatuses,
  turnStatuses,
  chats,
  chatTurns,
  chatMessages,
  tokenUsage,
  accounts,
  sessions,
  sessionsExt,
  contacts,
  policiesStatutes,
  emailPropertyCategory,
  stagingMessage,
  legalReferences,
  complianceScoresDetails,
  emailSentimentAnalysisDetails,
  keyPointsDetails,
  policyTypes,
  violationDetails,
  callToActionCategory,
  documentPropertyCallToActionCategory,
  emailRecipients,
  documentRelationshipReason,
  documentUnitEmbeddings,
  documentRelationship,
  documentUnitAnalysisFunctionAudit,
  callToActionDetailsCallToActionResponse,
  stagingAttachment,
} from './schema';

export const callToActionExpectedResponseRelations = relations(
  callToActionExpectedResponse,
  ({ one }) => ({
    callToActionDetail: one(callToActionDetails, {
      fields: [callToActionExpectedResponse.callToActionId],
      references: [callToActionDetails.propertyId],
    }),
    callToActionResponseDetail: one(callToActionResponseDetails, {
      fields: [callToActionExpectedResponse.callToActionResponseDetailId],
      references: [callToActionResponseDetails.propertyId],
    }),
  }),
);

export const callToActionDetailsRelations = relations(
  callToActionDetails,
  ({ one, many }) => ({
    callToActionExpectedResponses: many(callToActionExpectedResponse),
    documentProperty: one(documentProperty, {
      fields: [callToActionDetails.propertyId],
      references: [documentProperty.propertyId],
    }),
    documentPropertyCallToActionCategories: many(
      documentPropertyCallToActionCategory,
    ),
    callToActionDetailsCallToActionResponses: many(
      callToActionDetailsCallToActionResponse,
    ),
  }),
);

export const callToActionResponseDetailsRelations = relations(
  callToActionResponseDetails,
  ({ one, many }) => ({
    callToActionExpectedResponses: many(callToActionExpectedResponse),
    documentProperty: one(documentProperty, {
      fields: [callToActionResponseDetails.propertyId],
      references: [documentProperty.propertyId],
    }),
    callToActionDetailsCallToActionResponses: many(
      callToActionDetailsCallToActionResponse,
    ),
  }),
);

export const documentUnitsRelations = relations(
  documentUnits,
  ({ one, many }) => ({
    email: one(emails, {
      fields: [documentUnits.emailId],
      references: [emails.emailId],
    }),
    emailAttachment: one(emailAttachments, {
      fields: [documentUnits.attachmentId],
      references: [emailAttachments.attachmentId],
    }),
    documentProperty: one(documentProperty, {
      fields: [documentUnits.documentPropertyId],
      references: [documentProperty.propertyId],
      relationName:
        'documentUnits_documentPropertyId_documentProperty_propertyId',
    }),
    documentProperties: many(documentProperty, {
      relationName: 'documentProperty_documentId_documentUnits_unitId',
    }),
    documentUnitAnalysisStageAudits: many(documentUnitAnalysisStageAudit),
    violationDetails: many(violationDetails),
    documentUnitEmbeddings: many(documentUnitEmbeddings),
    docRel_targetDoc: many(documentRelationship, {
      relationName:
        'documentRelationship_targetDocumentId_documentUnits_unitId',
    }),
    docRel_sourceDocId: many(documentRelationship, {
      relationName:
        'documentRelationship_sourceDocumentId_documentUnits_unitId',
    }),
  }),
);

export const emailsRelations = relations(emails, ({ one, many }) => ({
  documentUnits: many(documentUnits),
  contact: one(contacts, {
    fields: [emails.senderId],
    references: [contacts.contactId],
  }),
  email: one(emails, {
    fields: [emails.parentId],
    references: [emails.emailId],
    relationName: 'emails_parentId_emails_emailId',
  }),
  emails: many(emails, {
    relationName: 'emails_parentId_emails_emailId',
  }),
  emailAttachments: many(emailAttachments),
  emailRecipients: many(emailRecipients),
}));

export const emailAttachmentsRelations = relations(
  emailAttachments,
  ({ one, many }) => ({
    documentUnits: many(documentUnits),
    email: one(emails, {
      fields: [emailAttachments.emailId],
      references: [emails.emailId],
    }),
    policiesStatute: one(policiesStatutes, {
      fields: [emailAttachments.policyId],
      references: [policiesStatutes.policyId],
    }),
    complianceScoresDetails: many(complianceScoresDetails),
    emailSentimentAnalysisDetails: many(emailSentimentAnalysisDetails),
  }),
);

export const documentPropertyRelations = relations(
  documentProperty,
  ({ one, many }) => ({
    documentUnits: many(documentUnits, {
      relationName:
        'documentUnits_documentPropertyId_documentProperty_propertyId',
    }),
    emailPropertyType: one(emailPropertyType, {
      fields: [documentProperty.documentPropertyTypeId],
      references: [emailPropertyType.documentPropertyTypeId],
    }),
    documentUnit: one(documentUnits, {
      fields: [documentProperty.documentId],
      references: [documentUnits.unitId],
      relationName: 'documentProperty_documentId_documentUnits_unitId',
    }),
    complianceScoresDetails_propertyId: many(complianceScoresDetails, {
      relationName:
        'complianceScoresDetails_propertyId_documentProperty_propertyId',
    }),
    complianceScoresDetails_actionPropertyId: many(complianceScoresDetails, {
      relationName:
        'complianceScoresDetails_actionPropertyId_documentProperty_propertyId',
    }),
    emailSentimentAnalysisDetails: many(emailSentimentAnalysisDetails),
    keyPointsDetails: many(keyPointsDetails),
    callToActionDetails: many(callToActionDetails),
    callToActionResponseDetails: many(callToActionResponseDetails),
    documentPropertyCallToActionCategories: many(
      documentPropertyCallToActionCategory,
    ),
  }),
);

export const emailPropertyTypeRelations = relations(
  emailPropertyType,
  ({ one, many }) => ({
    documentProperties: many(documentProperty),
    emailPropertyCategory: one(emailPropertyCategory, {
      fields: [emailPropertyType.emailPropertyCategoryId],
      references: [emailPropertyCategory.emailPropertyCategoryId],
    }),
  }),
);

export const documentUnitAnalysisStageAuditRelations = relations(
  documentUnitAnalysisStageAudit,
  ({ one, many }) => ({
    documentUnit: one(documentUnits, {
      fields: [documentUnitAnalysisStageAudit.documentId],
      references: [documentUnits.unitId],
    }),
    analysisStage: one(analysisStage, {
      fields: [documentUnitAnalysisStageAudit.analysisStageId],
      references: [analysisStage.analysisStageId],
    }),
    documentUnitAnalysisFunctionAudits: many(documentUnitAnalysisFunctionAudit),
  }),
);

export const analysisStageRelations = relations(analysisStage, ({ many }) => ({
  documentUnitAnalysisStageAudits: many(documentUnitAnalysisStageAudit),
}));

export const chatHistoryRelations = relations(chatHistory, ({ one }) => ({
  user: one(users, {
    fields: [chatHistory.userId],
    references: [users.id],
  }),
}));

// New chat history relations
export const messageStatusesRelations = relations(
  messageStatuses,
  ({ many }) => ({
    chatMessages: many(chatMessages),
  }),
);

export const turnStatusesRelations = relations(turnStatuses, ({ many }) => ({
  chatTurns: many(chatTurns),
}));

export const chatsRelations = relations(chats, ({ one, many }) => ({
  user: one(users, {
    fields: [chats.userId],
    references: [users.id],
  }),
  chatTurns: many(chatTurns),
  chatMessages: many(chatMessages),
}));

export const chatTurnsRelations = relations(chatTurns, ({ one, many }) => ({
  chat: one(chats, {
    fields: [chatTurns.chatId],
    references: [chats.id],
  }),
  status: one(turnStatuses, {
    fields: [chatTurns.statusId],
    references: [turnStatuses.id],
  }),
  chatMessages: many(chatMessages),
  tokenUsage: many(tokenUsage),
}));

export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
  chat: one(chats, {
    fields: [chatMessages.chatId],
    references: [chats.id],
  }),
  turn: one(chatTurns, {
    fields: [chatMessages.turnId],
    references: [chatTurns.turnId],
  }),
  status: one(messageStatuses, {
    fields: [chatMessages.statusId],
    references: [messageStatuses.id],
  }),
}));

export const tokenUsageRelations = relations(tokenUsage, ({ one }) => ({
  turn: one(chatTurns, {
    fields: [tokenUsage.turnId],
    references: [chatTurns.turnId],
  }),
}));

export const usersRelations = relations(users, ({ many }) => ({
  chatHistories: many(chatHistory),
  chats: many(chats),
  stagingMessages: many(stagingMessage),
}));

export const sessionsRelations = relations(sessions, ({ one, many }) => ({
  account: one(accounts, {
    fields: [sessions.userId],
    references: [accounts.userId],
  }),
  sessionsExts: many(sessionsExt),
}));

export const accountsRelations = relations(accounts, ({ many }) => ({
  sessions: many(sessions),
}));

export const sessionsExtRelations = relations(sessionsExt, ({ one }) => ({
  session: one(sessions, {
    fields: [sessionsExt.sessionId],
    references: [sessions.id],
  }),
}));

export const contactsRelations = relations(contacts, ({ many }) => ({
  emails: many(emails),
  emailRecipients: many(emailRecipients),
}));

export const policiesStatutesRelations = relations(
  policiesStatutes,
  ({ one, many }) => ({
    emailAttachments: many(emailAttachments),
    legalReferences: many(legalReferences),
    policyType: one(policyTypes, {
      fields: [policiesStatutes.policyTypeId],
      references: [policyTypes.policyTypeId],
    }),
  }),
);

export const emailPropertyCategoryRelations = relations(
  emailPropertyCategory,
  ({ many }) => ({
    emailPropertyTypes: many(emailPropertyType),
  }),
);

export const stagingMessageRelations = relations(
  stagingMessage,
  ({ one, many }) => ({
    user: one(users, {
      fields: [stagingMessage.userId],
      references: [users.id],
    }),
    stagingAttachments: many(stagingAttachment),
  }),
);

export const legalReferencesRelations = relations(
  legalReferences,
  ({ one }) => ({
    policiesStatute: one(policiesStatutes, {
      fields: [legalReferences.policyId],
      references: [policiesStatutes.policyId],
    }),
  }),
);

export const complianceScoresDetailsRelations = relations(
  complianceScoresDetails,
  ({ one }) => ({
    emailAttachment: one(emailAttachments, {
      fields: [complianceScoresDetails.attachmentId],
      references: [emailAttachments.attachmentId],
    }),
    documentProperty_propertyId: one(documentProperty, {
      fields: [complianceScoresDetails.propertyId],
      references: [documentProperty.propertyId],
      relationName:
        'complianceScoresDetails_propertyId_documentProperty_propertyId',
    }),
    documentProperty_actionPropertyId: one(documentProperty, {
      fields: [complianceScoresDetails.actionPropertyId],
      references: [documentProperty.propertyId],
      relationName:
        'complianceScoresDetails_actionPropertyId_documentProperty_propertyId',
    }),
  }),
);

export const emailSentimentAnalysisDetailsRelations = relations(
  emailSentimentAnalysisDetails,
  ({ one }) => ({
    emailAttachment: one(emailAttachments, {
      fields: [emailSentimentAnalysisDetails.attachmentId],
      references: [emailAttachments.attachmentId],
    }),
    documentProperty: one(documentProperty, {
      fields: [emailSentimentAnalysisDetails.propertyId],
      references: [documentProperty.propertyId],
    }),
  }),
);

export const keyPointsDetailsRelations = relations(
  keyPointsDetails,
  ({ one }) => ({
    documentProperty: one(documentProperty, {
      fields: [keyPointsDetails.propertyId],
      references: [documentProperty.propertyId],
    }),
  }),
);

export const policyTypesRelations = relations(policyTypes, ({ many }) => ({
  policiesStatutes: many(policiesStatutes),
}));

export const violationDetailsRelations = relations(
  violationDetails,
  ({ one }) => ({
    documentUnit: one(documentUnits, {
      fields: [violationDetails.emailDocumentId],
      references: [documentUnits.unitId],
    }),
  }),
);

export const documentPropertyCallToActionCategoryRelations = relations(
  documentPropertyCallToActionCategory,
  ({ one }) => ({
    callToActionCategory: one(callToActionCategory, {
      fields: [documentPropertyCallToActionCategory.ctaCategoryId],
      references: [callToActionCategory.ctaCategoryId],
    }),
    callToActionDetail: one(callToActionDetails, {
      fields: [documentPropertyCallToActionCategory.propertyId],
      references: [callToActionDetails.propertyId],
    }),
    documentProperty: one(documentProperty, {
      fields: [documentPropertyCallToActionCategory.propertyId],
      references: [documentProperty.propertyId],
    }),
  }),
);

export const callToActionCategoryRelations = relations(
  callToActionCategory,
  ({ many }) => ({
    documentPropertyCallToActionCategories: many(
      documentPropertyCallToActionCategory,
    ),
  }),
);

export const emailRecipientsRelations = relations(
  emailRecipients,
  ({ one }) => ({
    email: one(emails, {
      fields: [emailRecipients.emailId],
      references: [emails.emailId],
    }),
    contact: one(contacts, {
      fields: [emailRecipients.recipientId],
      references: [contacts.contactId],
    }),
  }),
);

export const documentRelationshipReasonRelations = relations(
  documentRelationshipReason,
  ({ many }) => ({
    documentRelationships: many(documentRelationship),
  }),
);

export const documentUnitEmbeddingsRelations = relations(
  documentUnitEmbeddings,
  ({ one }) => ({
    documentUnit: one(documentUnits, {
      fields: [documentUnitEmbeddings.documentId],
      references: [documentUnits.unitId],
    }),
  }),
);

export const documentRelationshipRelations = relations(
  documentRelationship,
  ({ one }) => ({
    documentUnit_targetDocumentId: one(documentUnits, {
      fields: [documentRelationship.targetDocumentId],
      references: [documentUnits.unitId],
      relationName:
        'documentRelationship_targetDocumentId_documentUnits_unitId',
    }),
    documentUnit_sourceDocumentId: one(documentUnits, {
      fields: [documentRelationship.sourceDocumentId],
      references: [documentUnits.unitId],
      relationName:
        'documentRelationship_sourceDocumentId_documentUnits_unitId',
    }),
    documentRelationshipReason: one(documentRelationshipReason, {
      fields: [documentRelationship.relationshipReasonId],
      references: [documentRelationshipReason.relationReasonId],
    }),
  }),
);

export const documentUnitAnalysisFunctionAuditRelations = relations(
  documentUnitAnalysisFunctionAudit,
  ({ one }) => ({
    documentUnitAnalysisStageAudit: one(documentUnitAnalysisStageAudit, {
      fields: [documentUnitAnalysisFunctionAudit.analysisAuditId],
      references: [documentUnitAnalysisStageAudit.analysisAuditId],
    }),
  }),
);

export const callToActionDetailsCallToActionResponseRelations = relations(
  callToActionDetailsCallToActionResponse,
  ({ one }) => ({
    callToActionDetail: one(callToActionDetails, {
      fields: [callToActionDetailsCallToActionResponse.callToActionId],
      references: [callToActionDetails.propertyId],
    }),
    callToActionResponseDetail: one(callToActionResponseDetails, {
      fields: [callToActionDetailsCallToActionResponse.callToActionResponseId],
      references: [callToActionResponseDetails.propertyId],
    }),
  }),
);

export const stagingAttachmentRelations = relations(
  stagingAttachment,
  ({ one }) => ({
    stagingMessage: one(stagingMessage, {
      fields: [stagingAttachment.stagingMessageId],
      references: [stagingMessage.id],
    }),
  }),
);
