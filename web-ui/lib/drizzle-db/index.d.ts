/**
 * Main entry point for Drizzle DB functionality
 * @module @/lib/drizzle-db
 */

declare module '@/lib/drizzle-db' {
  export type {
    DatabaseType,
    SchemaType,
    DocumentUnitType,
    DocumentPropertyType,
    DocumentPropertyTypeType,
    DocumentRelationshipType,
    EmailType,
    EmailAttachmentType,
    KeyPointType,
    CallToActionType,
    CallToActionCategoryType,
    CallToActionResponseType,
    CallToActionResponsiveActionLinkType,
    ChatMessagesType,
    ChatsType,
    ChatTurnsType,
    UserPublicKeysType,
    ViolationDetailsType,
    ComplianceScoreType,
    QueryBuilders,
    DocumentUnitQueryShape,
    DocumentPropertyQueryShape,
    EmailQueryShape,
    EmailAttachmentQueryShape,
    KeyPointQueryShape,
    CallToActionQueryShape,
    CallToActionCategoryQueryShape,
    CallToActionResponseQueryShape,
    ViolationDetailsQueryShape,
    ComplianceScoresDetailsQueryShape,
    ProvidersType,
    ModelsType,
    ModelQuotasType,
    Types,
  } from './drizzle-types';

  export type {
    DbFullSchemaType,
    DbSchemaType,
    DbDatabaseType,
    DbQueryResultHKT,
    DbTransactionType,
  } from './schema';

  export * from './connection';
  export * from './db-helpers';
  export { sql, type DrizzleSqlType } from './drizzle-sql';
}
