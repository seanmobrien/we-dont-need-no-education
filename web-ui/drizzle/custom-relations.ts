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
    cta: one(callToActionDetails, {
      fields: [callToActionExpectedResponse.callToActionId],
      references: [callToActionDetails.propertyId],
    }),
    ctaResponse: one(callToActionResponseDetails, {
      fields: [callToActionExpectedResponse.callToActionResponseDetailId],
      references: [callToActionResponseDetails.propertyId],
    }),
  }),
);

export const callToActionDetailsRelations = relations(
  callToActionDetails,
  ({ one, many }) => ({
    // callToActionExpectedResponses: many(callToActionExpectedResponse),
    docProp: one(documentProperty, {
      fields: [callToActionDetails.propertyId],
      references: [documentProperty.propertyId],
    }),
    cats: many(documentPropertyCallToActionCategory).withFieldName('cats'),
    responses: many(callToActionDetailsCallToActionResponse).withFieldName(
      'responses',
    ),
  }),
);

export const callToActionResponseDetailsRelations = relations(
  callToActionResponseDetails,
  ({ one, many }) => ({
    // callToActionExpectedResponses: many(callToActionExpectedResponse),
    docProp: one(documentProperty, {
      fields: [callToActionResponseDetails.propertyId],
      references: [documentProperty.propertyId],
    }),
    ctas: many(callToActionDetailsCallToActionResponse).withFieldName('ctas'),
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
    docProp: one(documentProperty, {
      fields: [documentUnits.documentPropertyId],
      references: [documentProperty.propertyId],
      relationName:
        'documentUnits_documentPropertyId_documentProperty_propertyId',
    }),
    docProps: many(documentProperty, {
      relationName: 'documentProperty_documentId_documentUnits_unitId',
    }),
    documentUnitAnalysisStageAudits: many(documentUnitAnalysisStageAudit),
    violations: many(violationDetails).withFieldName('violations'),
    documentUnitEmbeddings: many(documentUnitEmbeddings),
    docRel_targetDoc: many(documentRelationship, {
      relationName:
        'documentRelationship_targetDocumentId_documentUnits_unitId',
    }).withFieldName('docRel_targetDoc'),
    docRel_sourceDoc: many(documentRelationship, {
      relationName:
        'documentRelationship_sourceDocumentId_documentUnits_unitId',
    }).withFieldName('docRel_sourceDoc'),
  }),
);

export const emailsRelations = relations(emails, ({ one, many }) => ({
  doc: one(documentUnits, {
    fields: [emails.emailId, emails.documentType],
    references: [documentUnits.emailId, documentUnits.documentType],
  }),
  sender: one(contacts, {
    fields: [emails.senderId],
    references: [contacts.contactId],
  }),
  inReplyTo: one(emails, {
    fields: [emails.parentId],
    references: [emails.emailId],
    relationName: 'emails_parentId_emails_emailId',
  }),
  repliesTo: many(emails, {
    relationName: 'emails_parentId_emails_emailId',
  }).withFieldName('repliesTo'),
  emailAttachments: many(emailAttachments),
  emailRecipients: many(emailRecipients),
}));

export const emailAttachmentsRelations = relations(
  emailAttachments,
  ({ one, many }) => ({
    docs: many(documentUnits),
    email: one(emails, {
      fields: [emailAttachments.emailId],
      references: [emails.emailId],
    }),
    policiesStatute: one(policiesStatutes, {
      fields: [emailAttachments.policyId],
      references: [policiesStatutes.policyId],
    }),
    complianceScores: many(complianceScoresDetails),
    sentimentAnalysis: many(emailSentimentAnalysisDetails),
  }),
);

export const documentPropertyRelations = relations(
  documentProperty,
  ({ one, many }) => ({
    docPropType: one(emailPropertyType, {
      fields: [documentProperty.documentPropertyTypeId],
      references: [emailPropertyType.documentPropertyTypeId],
    }),
    doc: one(documentUnits, {
      fields: [documentProperty.documentId],
      references: [documentUnits.unitId],
      relationName: 'documentProperty_documentId_documentUnits_unitId',
    }),
    compliance: one(complianceScoresDetails, {
      relationName:
        'complianceScoresDetails_propertyId_documentProperty_propertyId',
      fields: [documentProperty.propertyId],
      references: [complianceScoresDetails.propertyId],
    }).withFieldName('compliance'),
    complianceScores: many(complianceScoresDetails, {
      relationName:
        'complianceScoresDetails_actionPropertyId_documentProperty_propertyId',
    }).withFieldName('complianceScores'),
    sentimentAnalysis: many(emailSentimentAnalysisDetails).withFieldName(
      'sentimentAnalysis',
    ),
    keyPoint: one(keyPointsDetails, {
      relationName: 'documentProperty_keyPointsDetails_propertyId',
      fields: [documentProperty.propertyId],
      references: [keyPointsDetails.propertyId],
    }).withFieldName('keyPoint'),
    cta: one(callToActionDetails, {
      relationName: 'documentProperty_callToActionDetails_propertyId',
      fields: [documentProperty.propertyId],
      references: [callToActionDetails.propertyId],
    }).withFieldName('cta'),
    response: one(callToActionResponseDetails, {
      relationName: 'documentProperty_callToActionResponseDetails_propertyId',
      fields: [documentProperty.propertyId],
      references: [callToActionResponseDetails.propertyId],
    }).withFieldName('response'),
    violation: one(violationDetails, {
      relationName: 'documentProperty_violationDetails_propertyId',
      fields: [documentProperty.propertyId],
      references: [violationDetails.propertyId],
    }).withFieldName('violation'),
  }),
);

export const emailPropertyTypeRelations = relations(
  emailPropertyType,
  ({ one, many }) => ({
    docProps: many(documentProperty),
    docPropCat: one(emailPropertyCategory, {
      fields: [emailPropertyType.emailPropertyCategoryId],
      references: [emailPropertyCategory.emailPropertyCategoryId],
    }),
  }),
);

export const documentUnitAnalysisStageAuditRelations = relations(
  documentUnitAnalysisStageAudit,
  ({ one, many }) => ({
    doc: one(documentUnits, {
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

export const usersRelations = relations(users, ({ many }) => ({
  chatHistories: many(chatHistory),
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
    docPropTypes: many(emailPropertyType),
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
    docProp: one(documentProperty, {
      fields: [emailSentimentAnalysisDetails.propertyId],
      references: [documentProperty.propertyId],
    }),
  }),
);

export const keyPointsDetailsRelations = relations(
  keyPointsDetails,
  ({ one }) => ({
    docProp: one(documentProperty, {
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
    target: one(documentUnits, {
      fields: [violationDetails.emailDocumentId],
      references: [documentUnits.unitId],
    }),
    docProp: one(documentProperty, {
      fields: [violationDetails.propertyId],
      references: [documentProperty.propertyId],
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
    cta: one(callToActionDetails, {
      fields: [documentPropertyCallToActionCategory.propertyId],
      references: [callToActionDetails.propertyId],
    }),
    docProp: one(documentProperty, {
      fields: [documentPropertyCallToActionCategory.propertyId],
      references: [documentProperty.propertyId],
    }),
  }),
);

export const callToActionCategoryRelations = relations(
  callToActionCategory,
  ({ many }) => ({
    cats: many(documentPropertyCallToActionCategory),
  }),
);

export const emailRecipientsRelations = relations(
  emailRecipients,
  ({ one }) => ({
    email: one(emails, {
      fields: [emailRecipients.emailId],
      references: [emails.emailId],
    }),
    recipient: one(contacts, {
      fields: [emailRecipients.recipientId],
      references: [contacts.contactId],
    }).withFieldName('recipient'),
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
    doc: one(documentUnits, {
      fields: [documentUnitEmbeddings.documentId],
      references: [documentUnits.unitId],
    }),
  }),
);

export const documentRelationshipRelations = relations(
  documentRelationship,
  ({ one }) => ({
    targetDoc: one(documentUnits, {
      fields: [documentRelationship.targetDocumentId],
      references: [documentUnits.unitId],
      relationName:
        'documentRelationship_targetDocumentId_documentUnits_unitId',
    }),
    sourceDoc: one(documentUnits, {
      fields: [documentRelationship.sourceDocumentId],
      references: [documentUnits.unitId],
      relationName:
        'documentRelationship_sourceDocumentId_documentUnits_unitId',
    }),
    reasonRelated: one(documentRelationshipReason, {
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
    cta: one(callToActionDetails, {
      fields: [callToActionDetailsCallToActionResponse.callToActionId],
      references: [callToActionDetails.propertyId],
    }),
    ctaResponse: one(callToActionResponseDetails, {
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
