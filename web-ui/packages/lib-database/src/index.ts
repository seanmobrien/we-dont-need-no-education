// Re-export driver types ONLY (no runtime code to avoid loading Node.js modules in edge/browser)
export type { CommandMeta, IResultset } from './driver/types';
export type { DbQueryFunction } from './driver/index-postgres';
// Driver connection functions are available via '@compliance-theater/database/driver'
// ORM connection functions (drizDb, drizDbWithInit, schema) are available via '@compliance-theater/database/orm'

// Re-export ORM types (safe for edge/browser)
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

// Re-export only lightweight utilities that don't require postgres
// These are safe to use in edge/browser environments
export { sql, type DrizzleSqlType } from './orm/drizzle-sql';
export { 
  isDrizzleError, 
  errorFromCode, 
  PG_ERROR_CODE_DESCRIPTIONS,
  type IPostgresError 
} from './orm/drizzle-error';

// Note: Runtime database functionality (schema, drizDb, drizDbWithInit, db helpers) is available via '@compliance-theater/database/orm'
// Direct driver access (pgDb, pgDbWithInit) is available via '@compliance-theater/database/driver'
// This prevents loading Node.js-specific modules (postgres, fs, net, tls) in edge/browser bundles
