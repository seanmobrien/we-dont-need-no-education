/**
 * @fileoverview Drizzle Database Type Definitions
 * 
 * This module provides comprehensive type definitions for database operations in the NoEducation application.
 * It extracts and exports TypeScript types from the Drizzle schema to ensure type safety across all
 * database interactions, including SELECT operations, query building, and transaction handling.
 * 
 * The module serves as the central type registry for:
 * - Table select types (inferred from schema definitions)
 * - Query builder types (for type-safe query construction)
 * - Individual entity types (for specific domain objects)
 * - Transaction types (for atomic operations)
 * 
 * This approach provides:
 * - **Type Safety**: Compile-time validation of database operations
 * - **Intellisense**: Rich autocompletion in IDEs
 * - **Refactoring Safety**: Automatic updates when schema changes
 * - **Documentation**: Self-documenting code through types
 * 
 * @module lib/drizzle-db/drizzle-types
 * @version 1.0.0
 * @since 2025-07-16
 * 
 * @example
 * ```typescript
 * import type { 
 *   EmailType, 
 *   DocumentUnitQueryShape, 
 *   DatabaseType 
 * } from '@/lib/drizzle-db/drizzle-types';
 * 
 * // Type-safe entity handling
 * function processEmail(email: EmailType) {
 *   console.log(`Processing email: ${email.subject}`);
 * }
 * 
 * // Type-safe query building
 * const queryOptions: DocumentUnitQueryShape = {
 *   where: eq(documentUnits.emailId, emailId),
 *   with: { documentProperty: true }
 * };
 * ```
 */

import type { FirstParameter } from '@/lib/typescript';
import type {
  DbFullSchemaType,
  DbDatabaseType,
} from './schema';

/**
 * Type alias for the complete database instance with full schema support.
 * 
 * This type represents the configured database instance that includes all tables,
 * relations, and query methods. It provides the foundation for all database
 * operations and type inference throughout the application.
 * 
 * @typedef {DbDatabaseType} DatabaseType
 * 
 * @example
 * ```typescript
 * import type { DatabaseType } from '@/lib/drizzle-db/drizzle-types';
 * 
 * function performDatabaseOperation(db: DatabaseType) {
 *   // Access to all schema tables and relations
 *   return db.query.users.findMany();
 * }
 * ```
 * 
 * @see {@link DbDatabaseType} - The underlying database type from schema
 */
export type DatabaseType = DbDatabaseType;

/**
 * Utility type that extracts SELECT result types from all schema tables.
 * 
 * This mapped type iterates through the complete schema and extracts the `$inferSelect`
 * type from each table that supports SELECT operations. It uses conditional type
 * mapping to include only tables that have the `$inferSelect` property.
 * 
 * The type works by:
 * 1. Iterating through all keys in `DbFullSchemaType`
 * 2. Checking if each entity has a `$inferSelect` property
 * 3. Including only those entities in the final type
 * 4. Extracting the actual SELECT type from each entity
 * 
 * This provides a centralized registry of all table result types, ensuring
 * consistency across the application when working with database query results.
 * 
 * @typedef {object} TableSelectTypes
 * 
 * @example
 * ```typescript
 * import type { TableSelectTypes } from '@/lib/drizzle-db/drizzle-types';
 * 
 * // Access specific table result types
 * type UserResult = TableSelectTypes['users'];
 * type EmailResult = TableSelectTypes['emails'];
 * 
 * // Use in functions that process query results
 * function processUsers(users: UserResult[]) {
 *   users.forEach(user => console.log(user.email));
 * }
 * ```
 * 
 * @see {@link DbFullSchemaType} - The complete schema type used for extraction
 */
export type TableSelectTypes = {
  [K in keyof DbFullSchemaType as '$inferSelect' extends keyof DbFullSchemaType[K]
    ? K
    : never]: DbFullSchemaType[K] extends { $inferSelect: unknown }
    ? DbFullSchemaType[K]['$inferSelect']
    : never;
};

/**
 * Type alias for the complete database schema.
 * 
 * This provides a more semantic name for the full schema type, making it
 * clear when working with schema-level operations versus specific table types.
 * 
 * @typedef {DbFullSchemaType} SchemaType
 * 
 * @example
 * ```typescript
 * import type { SchemaType } from '@/lib/drizzle-db/drizzle-types';
 * 
 * function getTableFromSchema<T extends keyof SchemaType>(
 *   schema: SchemaType, 
 *   tableName: T
 * ): SchemaType[T] {
 *   return schema[tableName];
 * }
 * ```
 * 
 * @see {@link DbFullSchemaType} - The underlying schema type
 */
export type SchemaType = DbFullSchemaType;

// ============================================================================
// INDIVIDUAL ENTITY TYPES
// ============================================================================

/**
 * Type definition for document unit entities.
 * 
 * Document units represent individual pieces of content that can be analyzed,
 * embedded, and processed. They serve as the atomic units of document processing
 * in the system and can be associated with emails, attachments, or standalone content.
 * 
 * @typedef {TableSelectTypes['documentUnits']} DocumentUnitType
 * 
 * @example
 * ```typescript
 * import type { DocumentUnitType } from '@/lib/drizzle-db/drizzle-types';
 * 
 * function analyzeDocumentUnit(unit: DocumentUnitType) {
 *   console.log(`Analyzing unit ${unit.unitId} of type ${unit.documentType}`);
 *   return processContent(unit.content);
 * }
 * ```
 */
export type DocumentUnitType = TableSelectTypes['documentUnits'];

/**
 * Type definition for document property entities.
 * 
 * Document properties represent metadata and analysis results associated with
 * document units. They store various types of extracted information, compliance
 * data, and analytical insights derived from document processing.
 * 
 * @typedef {TableSelectTypes['documentProperty']} DocumentPropertyType
 * 
 * @example
 * ```typescript
 * import type { DocumentPropertyType } from '@/lib/drizzle-db/drizzle-types';
 * 
 * function extractPropertyValue(property: DocumentPropertyType): string | null {
 *   return property.propertyValue;
 * }
 * ```
 */
export type DocumentPropertyType = TableSelectTypes['documentProperty'];

/**
 * Type definition for document property type metadata.
 * 
 * This represents the classification and categorization system for document
 * properties, defining what types of properties can be extracted and stored.
 * 
 * @typedef {TableSelectTypes['emailPropertyType']} DocumentPropertyTypeType
 * 
 * @example
 * ```typescript
 * import type { DocumentPropertyTypeType } from '@/lib/drizzle-db/drizzle-types';
 * 
 * function getPropertyTypeInfo(propertyType: DocumentPropertyTypeType) {
 *   return {
 *     id: propertyType.documentPropertyTypeId,
 *     description: propertyType.description
 *   };
 * }
 * ```
 */
export type DocumentPropertyTypeType = TableSelectTypes['emailPropertyType'];

/**
 * Type definition for document relationship entities.
 * 
 * Document relationships define connections and associations between different
 * document units, enabling the system to understand document hierarchies,
 * references, and contextual connections.
 * 
 * @typedef {TableSelectTypes['documentRelationship']} DocumentRelationshipType
 * 
 * @example
 * ```typescript
 * import type { DocumentRelationshipType } from '@/lib/drizzle-db/drizzle-types';
 * 
 * function processDocumentRelationship(relationship: DocumentRelationshipType) {
 *   console.log(`Relationship between ${relationship.parentDocumentId} and ${relationship.childDocumentId}`);
 * }
 * ```
 */
export type DocumentRelationshipType = TableSelectTypes['documentRelationship'];

/**
 * Type definition for email entities.
 * 
 * Emails represent the core communication objects in the system, containing
 * message content, metadata, and associated processing information.
 * 
 * @typedef {TableSelectTypes['emails']} EmailType
 * 
 * @example
 * ```typescript
 * import type { EmailType } from '@/lib/drizzle-db/drizzle-types';
 * 
 * function displayEmail(email: EmailType) {
 *   return {
 *     subject: email.subject,
 *     from: email.fromAddress,
 *     date: email.receivedDate
 *   };
 * }
 * ```
 */
export type EmailType = TableSelectTypes['emails'];

/**
 * Type definition for email attachment entities.
 * 
 * Email attachments represent files associated with email messages, including
 * their metadata, content, and processing status.
 * 
 * @typedef {TableSelectTypes['emailAttachments']} EmailAttachmentType
 * 
 * @example
 * ```typescript
 * import type { EmailAttachmentType } from '@/lib/drizzle-db/drizzle-types';
 * 
 * function processAttachment(attachment: EmailAttachmentType) {
 *   console.log(`Processing ${attachment.filename} (${attachment.mimeType})`);
 * }
 * ```
 */
export type EmailAttachmentType = TableSelectTypes['emailAttachments'];

/**
 * Type definition for key point entities.
 * 
 * Key points represent important information extracted from documents,
 * highlighting significant content that requires attention or action.
 * 
 * @typedef {TableSelectTypes['keyPointsDetails']} KeyPointType
 * 
 * @example
 * ```typescript
 * import type { KeyPointType } from '@/lib/drizzle-db/drizzle-types';
 * 
 * function highlightKeyPoint(keyPoint: KeyPointType) {
 *   return `Key Point: ${keyPoint.description}`;
 * }
 * ```
 */
export type KeyPointType = TableSelectTypes['keyPointsDetails'];

/**
 * Type definition for call-to-action entities.
 * 
 * Call-to-actions represent actionable items identified in documents that
 * require follow-up, response, or specific handling.
 * 
 * @typedef {TableSelectTypes['callToActionDetails']} CallToActionType
 * 
 * @example
 * ```typescript
 * import type { CallToActionType } from '@/lib/drizzle-db/drizzle-types';
 * 
 * function processCallToAction(cta: CallToActionType) {
 *   console.log(`Action required: ${cta.description}`);
 *   return { priority: cta.priority, dueDate: cta.dueDate };
 * }
 * ```
 */
export type CallToActionType = TableSelectTypes['callToActionDetails'];

/**
 * Type definition for call-to-action category entities.
 * 
 * Categories provide classification and organization for call-to-action items,
 * enabling better management and prioritization of required actions.
 * 
 * @typedef {TableSelectTypes['callToActionCategory']} CallToActionCategoryType
 * 
 * @example
 * ```typescript
 * import type { CallToActionCategoryType } from '@/lib/drizzle-db/drizzle-types';
 * 
 * function getCategoryInfo(category: CallToActionCategoryType) {
 *   return {
 *     name: category.categoryName,
 *     description: category.description
 *   };
 * }
 * ```
 */
export type CallToActionCategoryType = TableSelectTypes['callToActionCategory'];

/**
 * Type definition for call-to-action response entities.
 * 
 * Responses track the handling and completion of call-to-action items,
 * providing audit trails and status tracking for required actions.
 * 
 * @typedef {TableSelectTypes['callToActionResponseDetails']} CallToActionResponseType
 * 
 * @example
 * ```typescript
 * import type { CallToActionResponseType } from '@/lib/drizzle-db/drizzle-types';
 * 
 * function recordResponse(response: CallToActionResponseType) {
 *   console.log(`Response recorded for CTA: ${response.callToActionId}`);
 * }
 * ```
 */
export type CallToActionResponseType =
  TableSelectTypes['callToActionResponseDetails'];

/**
 * Type definition for call-to-action response link entities.
 * 
 * This type represents the linking table between call-to-actions and their responses,
 * enabling many-to-many relationships and complex response tracking.
 * 
 * @typedef {TableSelectTypes['callToActionDetailsCallToActionResponse']} CallToActionResponsiveActionLinkType
 * 
 * @example
 * ```typescript
 * import type { CallToActionResponsiveActionLinkType } from '@/lib/drizzle-db/drizzle-types';
 * 
 * function linkActionToResponse(link: CallToActionResponsiveActionLinkType) {
 *   console.log(`Linking CTA ${link.callToActionId} to response ${link.responseId}`);
 * }
 * ```
 */
export type CallToActionResponsiveActionLinkType =
  TableSelectTypes['callToActionDetailsCallToActionResponse'];

/**
 * Type definition for call-to-action response link entities.
 * 
 * This type represents the linking table between call-to-actions and their responses,
 * enabling many-to-many relationships and complex response tracking.
 * 
 * @typedef {TableSelectTypes['callToActionDetailsCallToActionResponse']} CallToActionResponsiveActionLinkType
 * 
 * @example
 * ```typescript
 * import type { UserPublicKeysType } from '@/lib/drizzle-db';
 * 
 * function getUserPublicKeys(keys: UserPublicKeysType[]) {
 *   keys.forEach(key => {
 *     console.log(`User ID: ${key.userId}, Public Key: ${key.publicKey}`);
 *   });
 * }
 * ```
 */
export type UserPublicKeysType =
  TableSelectTypes['userPublicKeys'];

/**
 * Type definition for violation detail entities.
 * 
 * Violation details represent compliance issues, policy violations, or regulatory
 * concerns identified during document analysis and processing.
 * 
 * @typedef {TableSelectTypes['violationDetails']} ViolationDetailsType
 * 
 * @example
 * ```typescript
 * import type { ViolationDetailsType } from '@/lib/drizzle-db/drizzle-types';
 * 
 * function handleViolation(violation: ViolationDetailsType) {
 *   console.error(`Violation detected: ${violation.description}`);
 *   return { severity: violation.severity, action: 'escalate' };
 * }
 * ```
 */
export type ViolationDetailsType = TableSelectTypes['violationDetails'];


/**
 * Type definition for model entities.
 * 
 * Models represent AI models available for use in the system, including their
 * metadata, capabilities, and associated providers.
 * 
 * @typedef {TableSelectTypes['models']} ModelsType
 * 
 * @example
 * ```typescript
 * import type { ModelsType } from '@/lib/drizzle-db/drizzle-types';
 * function getModelInfo(model: ModelsType) {
 *   return {
 *     id: model.modelId,
 *     name: model.name,
 *     description: model.description,
 *     provider: model.providerName,
 *     capabilities: model.capabilities
 *   };
 * }
 * ```
 */
export type ModelsType = TableSelectTypes['models'];


/**
 * Type definition for model providers.
 * 
 * Providers provide the AI models available in the system, including their
 * 
 * @typedef {TableSelectTypes['providers']} ProvidersType
 * 
 * @example
 * ```typescript
 * import type { ProvidersType } from '@/lib/drizzle-db/drizzle-types';
 * function getModelInfo(providers: ProvidersType) {
 *   return {
 *     id: providers.modelId,
 *     name: providers.name,
 *     description: providers.description,
 *   };
 * }
 * ```
 */
export type ProvidersType = TableSelectTypes['providers'];

/**
 * Type definition for model quota entities.
 * 
 * Model quotas represent usage limits, allocation, and consumption tracking for AI models
 * within the system. They help manage resource usage, enforce limits, and provide insights
 * into model utilization for users or organizations.
 * 
 * @typedef {TableSelectTypes['modelQuotas']} ModelQuotasType
 * 
 * @example
 * ```typescript
 * import type { ModelQuotasType } from '@/lib/drizzle-db/drizzle-types';
 * function getQuotaInfo(quota: ModelQuotasType) {
 *   return {
 *     modelId: quota.modelId,
 *     userId: quota.userId,
 *     quotaLimit: quota.quotaLimit,
 *     quotaUsed: quota.quotaUsed,
 *     period: quota.period
 *   };
 * }
 * ```
 */
export type ModelQuotasType = TableSelectTypes['modelQuotas'];

/**
 * Type definition for compliance score entities.
 * 
 * Compliance scores provide quantitative assessments of document compliance
 * with various policies, regulations, and organizational standards.
 * 
 * @typedef {TableSelectTypes['complianceScoresDetails']} ComplianceScoreType
 * 
 * @example
 * ```typescript
 * import type { ComplianceScoreType } from '@/lib/drizzle-db/drizzle-types';
 * 
 * function evaluateCompliance(score: ComplianceScoreType) {
 *   return {
 *     score: score.complianceScore,
 *     status: score.complianceScore > 0.8 ? 'compliant' : 'needs-review'
 *   };
 * }
 * ```
 */
export type ComplianceScoreType = TableSelectTypes['complianceScoresDetails'];




/**
 * Type definition for chat message instance
 *
 * Chat messages represent individual messages exchanged in a chat session,
 * including their content, metadata, and associated user information.
 *
 * @typedef {TableSelectTypes['chatMessages']} ChatMessagesType
 * ChatMessagesType
 * @example
 * ```typescript
 * import type { ChatMessagesType } from '@/lib/drizzle-db/drizzle-types';
 * 
 * function evaluateChatMessage(message: ChatMessagesType) {
 *   return {
 *     content: message.content,
 *     role: message.role,
 *     messageId: message.messageId
 *   };
 * }
 * ```
 */
export type ChatMessagesType = TableSelectTypes['chatMessages'];

export type ChatTurnsType = TableSelectTypes['chatTurns'];

export type ChatsType = TableSelectTypes['chats'];



// ============================================================================
// QUERY BUILDER TYPES
// ============================================================================

/**
 * Utility type that extracts query builder interfaces for all database tables.
 * 
 * This mapped type provides type-safe query building capabilities by extracting
 * the parameter types from each table's `findFirst` method. It enables
 * intellisense and type checking for query options including WHERE clauses,
 * ORDER BY, relations, and other query parameters.
 * 
 * The type works by:
 * 1. Accessing the `query` property of the database type
 * 2. For each table in the query interface, extracting the first parameter of `findFirst`
 * 3. This parameter contains all the query options (where, orderBy, with, etc.)
 * 
 * @typedef {object} QueryBuilders
 * 
 * @example
 * ```typescript
 * import type { QueryBuilders } from '@/lib/drizzle-db/drizzle-types';
 * 
 * // Type-safe query options
 * const userQuery: QueryBuilders['users'] = {
 *   where: eq(users.email, 'user@example.com'),
 *   with: { profile: true },
 *   orderBy: asc(users.createdAt)
 * };
 * 
 * // Use in database operations
 * const result = await db.query.users.findFirst(userQuery);
 * ```
 * 
 * @see {@link FirstParameter} - Utility type for extracting first parameter
 * @see {@link DatabaseType} - The database type used for query extraction
 */
export type QueryBuilders = {
  [K in keyof DatabaseType['query']]: FirstParameter<
    DatabaseType['query'][K]['findFirst']
  >;
};

/**
 * Query builder type for document unit operations.
 * 
 * @typedef {QueryBuilders['documentUnits']} DocumentUnitQueryShape
 * 
 * @example
 * ```typescript
 * const query: DocumentUnitQueryShape = {
 *   where: eq(documentUnits.emailId, emailId),
 *   with: { documentProperty: true }
 * };
 * ```
 */
export type DocumentUnitQueryShape = QueryBuilders['documentUnits'];

/**
 * Query builder type for document property operations.
 * 
 * @typedef {QueryBuilders['documentProperty']} DocumentPropertyQueryShape
 * 
 * @example
 * ```typescript
 * const query: DocumentPropertyQueryShape = {
 *   where: eq(documentProperty.documentPropertyTypeId, typeId),
 *   orderBy: desc(documentProperty.createdOn)
 * };
 * ```
 */
export type DocumentPropertyQueryShape = QueryBuilders['documentProperty'];

/**
 * Query builder type for email operations.
 * 
 * @typedef {QueryBuilders['emails']} EmailQueryShape
 * 
 * @example
 * ```typescript
 * const query: EmailQueryShape = {
 *   where: and(
 *     eq(emails.fromAddress, sender),
 *     gt(emails.receivedDate, lastWeek)
 *   ),
 *   with: { attachments: true, recipients: true }
 * };
 * ```
 */
export type EmailQueryShape = QueryBuilders['emails'];

/**
 * Query builder type for email attachment operations.
 * 
 * @typedef {QueryBuilders['emailAttachments']} EmailAttachmentQueryShape
 * 
 * @example
 * ```typescript
 * const query: EmailAttachmentQueryShape = {
 *   where: eq(emailAttachments.emailId, emailId),
 *   orderBy: asc(emailAttachments.filename)
 * };
 * ```
 */
export type EmailAttachmentQueryShape = QueryBuilders['emailAttachments'];

/**
 * Query builder type for key point operations.
 * 
 * @typedef {QueryBuilders['keyPointsDetails']} KeyPointQueryShape
 * 
 * @example
 * ```typescript
 * const query: KeyPointQueryShape = {
 *   where: eq(keyPointsDetails.documentId, documentId),
 *   orderBy: desc(keyPointsDetails.importance)
 * };
 * ```
 */
export type KeyPointQueryShape = QueryBuilders['keyPointsDetails'];

/**
 * Query builder type for call-to-action operations.
 * 
 * @typedef {QueryBuilders['callToActionDetails']} CallToActionQueryShape
 * 
 * @example
 * ```typescript
 * const query: CallToActionQueryShape = {
 *   where: eq(callToActionDetails.status, 'pending'),
 *   with: { category: true, responses: true }
 * };
 * ```
 */
export type CallToActionQueryShape = QueryBuilders['callToActionDetails'];

/**
 * Query builder type for call-to-action category operations.
 * 
 * @typedef {QueryBuilders['callToActionCategory']} CallToActionCategoryQueryShape
 * 
 * @example
 * ```typescript
 * const query: CallToActionCategoryQueryShape = {
 *   orderBy: asc(callToActionCategory.categoryName)
 * };
 * ```
 */
export type CallToActionCategoryQueryShape =
  QueryBuilders['callToActionCategory'];

/**
 * Query builder type for call-to-action response operations.
 * 
 * @typedef {QueryBuilders['callToActionResponseDetails']} CallToActionResponseQueryShape
 * 
 * @example
 * ```typescript
 * const query: CallToActionResponseQueryShape = {
 *   where: eq(callToActionResponseDetails.callToActionId, ctaId),
 *   orderBy: desc(callToActionResponseDetails.responseDate)
 * };
 * ```
 */
export type CallToActionResponseQueryShape =
  QueryBuilders['callToActionResponseDetails'];

/**
 * Query builder type for violation detail operations.
 * 
 * @typedef {QueryBuilders['violationDetails']} ViolationDetailsQueryShape
 * 
 * @example
 * ```typescript
 * const query: ViolationDetailsQueryShape = {
 *   where: eq(violationDetails.severity, 'high'),
 *   orderBy: desc(violationDetails.detectedAt)
 * };
 * ```
 */
export type ViolationDetailsQueryShape = QueryBuilders['violationDetails'];

/**
 * Query builder type for compliance score operations.
 * 
 * @typedef {QueryBuilders['complianceScoresDetails']} ComplianceScoresDetailsQueryShape
 * 
 * @example
 * ```typescript
 * const query: ComplianceScoresDetailsQueryShape = {
 *   where: lt(complianceScoresDetails.complianceScore, 0.8),
 *   orderBy: asc(complianceScoresDetails.complianceScore)
 * };
 * ```
 */
export type ComplianceScoresDetailsQueryShape =
  QueryBuilders['complianceScoresDetails'];

/**
 * Re-export of the database transaction type from the schema module.
 * 
 * This provides a convenient import path for transaction types without
 * requiring direct access to the schema module.
 * 
 * @see {@link DbTransactionType} - The transaction type from schema module
 */
export type { DbTransactionType } from './schema';

/**
 * Namespace containing organized type collections for easier access.
 * 
 * This namespace provides a structured way to access related types,
 * making it easier to import and use type collections in a organized manner.
 * 
 * @namespace Types
 * 
 * @example
 * ```typescript
 * import { Types } from '@/lib/drizzle-db/drizzle-types';
 * 
 * // Access table types
 * type UserType = Types.Tables['users'];
 * 
 * // Access query types
 * type UserQuery = Types.Queries['users'];
 * ```
 */
// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace Types {
  /**
   * Collection of all table SELECT result types.
   * 
   * @typedef {TableSelectTypes} Tables
   */
  export type Tables = TableSelectTypes;
  
  /**
   * Collection of all query builder types.
   * 
   * @typedef {QueryBuilders} Queries
   */
  export type Queries = QueryBuilders;
}
