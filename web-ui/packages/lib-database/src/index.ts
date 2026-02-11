// Re-export driver types and utilities (excluding sql to avoid conflicts)
export type * from './driver/types';
export * from './driver/index-postgres';
export type { DbQueryFunction } from './driver/index-postgres';
export { pgDb, pgDbWithInit } from './driver/connection';

// Re-export ORM types and utilities
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
  ChatToolType,
  ChatToolCallsType,
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
} from './orm/drizzle-types';
export type {
  DbFullSchemaType,
  DbSchemaType,
  DbDatabaseType,
  DbQueryResultHKT,
  DbTransactionType,  
} from './orm/schema';
export * from './orm/connection';
export * from './orm/db-helpers';
export { sql, type DrizzleSqlType } from './orm/drizzle-sql';
export { 
  isDrizzleError, 
  errorFromCode, 
  PG_ERROR_CODE_DESCRIPTIONS,
  type PostgresError 
} from './orm/drizzle-error';

// Re-export schema tables
export * from './schema/schema';
