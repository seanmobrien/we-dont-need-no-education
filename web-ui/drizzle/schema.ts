import {
  pgTable,
  foreignKey,
  uuid,
  text,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  type AnyPgColumn,
  index,
  check,
  serial,
  integer,
  varchar,
  timestamp,
  jsonb,
  uniqueIndex,
  vector,
  unique,
  smallint,
  boolean,
  bigint,
  doublePrecision,
  date,
  numeric,
  primaryKey,
  time,
  real,
  pgView,
  interval,
  pgMaterializedView,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// New table: user_public_keys
export const userPublicKeys = pgTable(
  'user_public_keys',
  {
    id: serial('id').primaryKey().notNull(),
    userId: integer('user_id').notNull(),
    publicKey: text('public_key').notNull(), // base64-encoded public key
    effectiveDate: timestamp('effective_date', { mode: 'string' }).notNull(),
    expirationDate: timestamp('expiration_date', { mode: 'string' }),
    createdAt: timestamp('created_at', { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: 'fk_user_public_keys_user_id',
    }).onDelete('cascade'),
    index('idx_user_public_keys_user_id').using('btree', table.userId.asc().nullsLast().op('int4_ops')),
    index('idx_user_public_keys_effective').using('btree', table.effectiveDate.asc().nullsLast().op('timestamp_ops')),
    index('idx_user_public_keys_expiration').using('btree', table.expirationDate.asc().nullsLast().op('timestamp_ops')),
  ]
);

export const importStageType = pgEnum('import_stage_type', [
  'staged',
  'headers',
  'body',
  'contacts',
  'attachments',
  'complete',
]);
export const recipientType = pgEnum('recipient_type', ['to', 'cc', 'bcc']);

export const callToActionExpectedResponse = pgTable(
  'call_to_action_expected_response',
  {
    callToActionResponseId: uuid('call_to_action_response_id')
      .primaryKey()
      .notNull(),
    callToActionId: uuid('call_to_action_id').notNull(),
    callToActionResponseDetailId: uuid('call_to_action_response_detail_id'),
    description: text().notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.callToActionId],
      foreignColumns: [callToActionDetails.propertyId],
      name: 'fk_call_to_action_id',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.callToActionResponseDetailId],
      foreignColumns: [callToActionResponseDetails.propertyId],
      name: 'fk_call_to_action_response',
    }).onDelete('cascade'),
  ],
);

export const documentUnits = pgTable(
  'document_units',
  {
    unitId: serial('unit_id').primaryKey().notNull(),
    emailId: uuid('email_id'),
    attachmentId: integer('attachment_id'),
    documentPropertyId: uuid('document_property_id'),
    content: text(),
    documentType: varchar('document_type', { length: 50 }),
    createdOn: timestamp('created_on', { mode: 'string' }).default(
      sql`CURRENT_TIMESTAMP`,
    ),
    embeddingModel: varchar('embedding_model', { length: 255 }),
    embeddedOn: timestamp('embedded_on', { mode: 'string' }),
  },
  (table) => [
    index('idx_document_units_attachment').using(
      'btree',
      table.attachmentId.asc().nullsLast().op('int4_ops'),
    ),
    index('idx_document_units_email').using(
      'btree',
      table.emailId.asc().nullsLast().op('uuid_ops'),
    ),
    foreignKey({
      columns: [table.attachmentId],
      foreignColumns: [emailAttachments.attachmentId],
      name: 'document_units_attachment_id_fkey',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.emailId],
      foreignColumns: [emails.emailId],
      name: 'document_units_email_id_fkey',
    }).onDelete('cascade'),
    /* I don't understand drizzle well enough to know why yet, but this FK fucks everything up
    foreignKey({
      columns: [table.documentPropertyId],
      foreignColumns: [documentProperty.propertyId],
      name: 'document_units_email_property_id_fkey1',
    }).onDelete('cascade'),
  */
    check(
      'document_type_check_allowed_values',
      sql`(document_type)::text = ANY (ARRAY[('email'::character varying)::text, ('attachment'::character varying)::text, ('note'::character varying)::text, ('key_point'::character varying)::text, ('cta_response'::character varying)::text, ('cta'::character varying)::text, ('sentiment'::character varying)::text, ('pending_upload'::character varying)::text, ('compliance'::character varying)::text]))) NOT VALID`,
    ),
  ],
);

export const chats = pgTable(
  'chats',
  {
    id: text().primaryKey().notNull(),
    userId: integer('user_id').notNull(),
    createdAt: timestamp('created_at', {
      withTimezone: true,
      mode: 'string',
    }).defaultNow(),
    title: text(),
    metadata: jsonb(),
  },
  (table) => [
    index('idx_chats_created_at').using(
      'btree',
      table.createdAt.asc().nullsLast().op('timestamptz_ops'),
    ),
    index('idx_chats_user_id').using(
      'btree',
      table.userId.asc().nullsLast().op('int4_ops'),
    ),
  ],
);

export const mcpSessions = pgTable(
  'mcp_sessions',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    chatId: text('chat_id').notNull(),
    turnId: integer('turn_id').notNull(),
    providerId: text('provider_id'),
    startedAt: timestamp('started_at', {
      withTimezone: true,
      mode: 'string',
    }).defaultNow(),
    endedAt: timestamp('ended_at', { withTimezone: true, mode: 'string' }),
    status: text(),
    error: text(),
    metadata: jsonb(),
  },
  (table) => [
    index('idx_mcp_sessions_provider_id').using(
      'btree',
      table.providerId.asc().nullsLast().op('text_ops'),
    ),
    foreignKey({
      columns: [table.chatId, table.turnId],
      foreignColumns: [chatTurns.chatId, chatTurns.turnId],
      name: 'mcp_sessions_chat_id_turn_id_fkey',
    }).onDelete('cascade'),
    check(
      'mcp_sessions_status_check',
      sql`status = ANY (ARRAY['active'::text, 'completed'::text, 'error'::text])`,
    ),
  ],
);

export const documentProperty = pgTable(
  'document_property',
  {
    propertyValue: text('property_value'),
    documentPropertyTypeId: integer('document_property_type_id').notNull(),
    propertyId: uuid('property_id').primaryKey().notNull(),
    documentId: integer('document_id').notNull(),
    createdOn: timestamp('created_on', { mode: 'string' }),
    policyBasis: text('policy_basis').array(),
    tags: text().array(),
  },
  (table) => [
    index('document_property_property_value_trgm_idx')
      .using('gin', table.propertyValue.asc().nullsLast().op('gin_trgm_ops'))
      .with({ fastupdate: 'true' }),
    uniqueIndex('document_property_unique_idx').using(
      'btree',
      table.documentId.asc().nullsLast().op('uuid_ops'),
      table.documentPropertyTypeId.asc().nullsLast().op('int4_ops'),
      table.propertyId.asc().nullsLast().op('int4_ops'),
    ),
    foreignKey({
      columns: [table.documentPropertyTypeId],
      foreignColumns: [emailPropertyType.documentPropertyTypeId],
      name: 'document_property_email_property_type',
    }),
    foreignKey({
      columns: [table.documentId],
      foreignColumns: [documentUnits.unitId],
      name: 'document_property_emails',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
  ],
);

export const documentRelationshipReason = pgTable(
  'document_relationship_reason',
  {
    relationReasonId: integer('relation_reason_id')
      .primaryKey()
      .generatedByDefaultAsIdentity({
        name: 'document_property_relation_reason_relation_reason_id_seq',
        startWith: 1,
        increment: 1,
        minValue: 1,
        maxValue: 2147483647,
        cache: 1,
      }),
    description: text(),
  },
);

export const callToActionCategory = pgTable('call_to_action_category', {
  ctaCategoryId: uuid('cta_category_id').primaryKey().notNull(),
  categoryName: text('category_name').notNull(),
  categoryDescription: text('category_description').notNull(),
  ctaCategoryTextEmbedding: vector('cta_category_text_embedding', {
    dimensions: 1536,
  }),
  ctaCategoryTextEmbeddingModel: text('cta_category_text_embedding_model'),
});

export const turnStatuses = pgTable(
  'turn_statuses',
  {
    id: smallint().primaryKey().notNull(),
    code: text().notNull(),
    description: text(),
  },
  (table) => [unique('turn_statuses_code_key').on(table.code)],
);

export const mcpEvents = pgTable(
  'mcp_events',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    sessionId: uuid('session_id').notNull(),
    toolInstanceId: uuid('tool_instance_id'),
    eventType: text('event_type'),
    message: text(),
    eventTime: timestamp('event_time', {
      withTimezone: true,
      mode: 'string',
    }).defaultNow(),
    metadata: jsonb(),
  },
  (table) => [
    index('idx_mcp_events_tool_instance_id').using(
      'btree',
      table.toolInstanceId.asc().nullsLast().op('uuid_ops'),
    ),
    foreignKey({
      columns: [table.sessionId],
      foreignColumns: [mcpSessions.id],
      name: 'mcp_events_session_id_fkey',
    }).onDelete('cascade'),
  ],
);

export const messageStatuses = pgTable(
  'message_statuses',
  {
    id: smallint().primaryKey().notNull(),
    code: text().notNull(),
    description: text(),
  },
  (table) => [unique('message_statuses_code_key').on(table.code)],
);

export const intermediateLlmRequestLogs = pgTable(
  'intermediate_llm_request_logs',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    chatId: text('chat_id').notNull(),
    turnId: integer('turn_id').notNull(),
    toolInstanceId: uuid('tool_instance_id'),
    providerId: text('provider_id'),
    createdAt: timestamp('created_at', {
      withTimezone: true,
      mode: 'string',
    }).defaultNow(),
    prompt: jsonb(),
    response: jsonb(),
    promptTokens: integer('prompt_tokens'),
    completionTokens: integer('completion_tokens'),
    totalTokens: integer('total_tokens'),
    latencyMs: integer('latency_ms'),
    error: text(),
    warnings: text().array(),
  },
  (table) => [
    index('idx_llm_logs_provider_id').using(
      'btree',
      table.providerId.asc().nullsLast().op('text_ops'),
    ),
    index('idx_llm_logs_tool_instance_id').using(
      'btree',
      table.toolInstanceId.asc().nullsLast().op('uuid_ops'),
    ),
    foreignKey({
      columns: [table.chatId, table.turnId],
      foreignColumns: [chatTurns.chatId, chatTurns.turnId],
      name: 'intermediate_llm_request_logs_chat_id_turn_id_fkey',
    }).onDelete('cascade'),
  ],
);

export const analysisStage = pgTable('analysis_stage', {
  analysisStageId: integer('analysis_stage_id').primaryKey().notNull(),
  description: text(),
  orderBy: integer('order_by'),
});

export const documentUnitAnalysisStageAudit = pgTable(
  'document_unit_analysis_stage_audit',
  {
    analysisAuditId: integer('analysis_audit_id')
      .primaryKey()
      .generatedAlwaysAsIdentity({
        name: 'document_unit_analysis_stage_audit_analysis_audit_id_seq',
        startWith: 1,
        increment: 1,
        minValue: 1,
        maxValue: 2147483647,
        cache: 1,
      }),
    documentId: integer('document_id'),
    analysisStageId: integer('analysis_stage_id'),
    detectedPoints: integer('detected_points'),
    timestamp: timestamp({ mode: 'string' }),
    notes: integer(),
    message: text(),
    iteration: integer().default(1).notNull(),
    tokensInput: integer('tokens_input').default(0).notNull(),
    tokensOutput: integer('tokens_output').default(0).notNull(),
    completionSignalled: boolean('completion_signalled'),
    inPostProcessingQueue: boolean('in_post_processing_queue'),
  },
  (table) => [
    foreignKey({
      columns: [table.analysisStageId],
      foreignColumns: [analysisStage.analysisStageId],
      name: 'document_unit_analysis_audit_stage_fk',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.documentId],
      foreignColumns: [documentUnits.unitId],
      name: 'document_unit_analysis_audt_document_fk',
    }).onDelete('cascade'),
  ],
);

export const chatTurnSequences = pgTable('chat_turn_sequences', {
  chatId: text('chat_id').primaryKey().notNull(),
  lastTurnId: integer('last_turn_id').default(0).notNull(),
});

export const threads = pgTable('threads', {
  threadId: serial('thread_id').primaryKey().notNull(),
  subject: text().notNull(),
  createdAt: timestamp('created_at', { mode: 'string' }).default(
    sql`CURRENT_TIMESTAMP`,
  ),
  externalId: varchar('external_id', { length: 255 }),
});

export const chatHistory = pgTable(
  'chat_history',
  {
    chatHistoryId: uuid('chat_history_id').primaryKey().notNull(),
    timestamp: timestamp({ mode: 'string' })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    request: text().notNull(),
    result: jsonb(),
    userId: integer('user_id').notNull(),
  },
  (table) => [
    index('idx_user_timestamp')
      .using(
        'btree',
        table.userId.asc().nullsLast().op('int4_ops'),
        table.timestamp.desc().nullsFirst().op('int4_ops'),
      )
      .with({ deduplicate_items: 'true' }),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: 'fk_chat_history_user',
    }).onDelete('cascade'),
  ],
);

export const accounts = pgTable(
  'accounts',
  {
    id: serial().primaryKey().notNull(),
    userId: integer("user_id").notNull(),
    type: varchar({ length: 255 }).notNull(),
    provider: varchar({ length: 255 }).notNull(),
    providerAccountId: varchar("provider_account_id", { length: 255 }).notNull(),
    refreshToken: text('refresh_token'),
    accessToken: text('access_token'),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    expiresAt: bigint('expires_at', { mode: 'number' }),
    tokenType: text('token_type'),
    scope: text(),
    idToken: text('id_token'),
    sessionState: text('session_state'),
  },
  (table) => [
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: 'accounts_userId_idx',
    }).onDelete('cascade'),
    unique('constraint_userId').on(table.userId),
  ],
);

export const sessions = pgTable(
  'sessions',
  {
    id: serial().primaryKey().notNull(),
    sessionToken: varchar({ length: 255 }).notNull(),
    userId: integer("user_id").notNull(),
    expires: timestamp({ withTimezone: true, mode: 'string' }).notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.userId],
      foreignColumns: [accounts.userId],
      name: 'FK_account',
    }),
  ],
);

export const sessionsExt = pgTable(
  'sessions_ext',
  {
    sessionId: integer('session_id').primaryKey().generatedByDefaultAsIdentity({
      name: 'sessions_ext_session_id_seq',
      startWith: 1,
      increment: 1,
      minValue: 1,
      maxValue: 2147483647,
      cache: 1,
    }),
    tokenGmail: varchar('token_gmail', { length: 255 }),
  },
  (table) => [
    foreignKey({
      columns: [table.sessionId],
      foreignColumns: [sessions.id],
      name: 'FK_sessions_ext_sessions',
    }).onDelete('cascade'),
  ],
);

export const emailAttachments = pgTable(
  'email_attachments',
  {
    attachmentId: serial('attachment_id').primaryKey().notNull(),
    fileName: text('file_name').notNull(),
    filePath: text('file_path').notNull(),
    extractedText: text('extracted_text'),
    // TODO: failed to parse database type 'tsvector'
    // extractedTextTsv: unknown("extracted_text_tsv"),
    policyId: integer('policy_id'),
    summary: text(),
    emailId: uuid('email_id').notNull(),
    mimeType: text('mime_type').notNull(),
    size: integer().notNull(),
  },
  (table) => [
    index('fki_email_attachments_email_fkey').using(
      'btree',
      table.emailId.asc().nullsLast().op('uuid_ops'),
    ),
    //index("idx_attachment_search").using("gin", table.extractedTextTsv.asc().nullsLast().op("tsvector_ops")),
    index('idx_email_attachments_email_id').using(
      'btree',
      table.emailId.asc().nullsLast().op('uuid_ops'),
    ),
    foreignKey({
      columns: [table.emailId],
      foreignColumns: [emails.emailId],
      name: 'email_attachments_email_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
    foreignKey({
      columns: [table.policyId],
      foreignColumns: [policiesStatutes.policyId],
      name: 'email_attachments_policy_id_fkey',
    }).onDelete('set null'),
  ],
);

export const emailPropertyType = pgTable(
  'email_property_type',
  {
    documentPropertyTypeId: serial('document_property_type_id')
      .primaryKey()
      .notNull(),
    emailPropertyCategoryId: integer('email_property_category_id').notNull(),
    propertyName: varchar('property_name', { length: 100 }).notNull(),
    createdAt: timestamp('created_at', { mode: 'string' })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex('email_property_category_property_type_id').using(
      'btree',
      table.emailPropertyCategoryId.asc().nullsLast().op('int4_ops'),
      table.documentPropertyTypeId.asc().nullsLast().op('int4_ops'),
    ),
    foreignKey({
      columns: [table.emailPropertyCategoryId],
      foreignColumns: [emailPropertyCategory.emailPropertyCategoryId],
      name: 'email_property_type_email_property_category',
    }).onDelete('set null'),
  ],
);

export const emailPropertyCategory = pgTable('email_property_category', {
  emailPropertyCategoryId: serial('email_property_category_id')
    .primaryKey()
    .notNull(),
  description: varchar({ length: 50 }),
  createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
});

export const contacts = pgTable(
  'contacts',
  {
    contactId: serial('contact_id').primaryKey().notNull(),
    name: varchar({ length: 255 }).notNull(),
    email: varchar({ length: 255 }).notNull(),
    roleDscr: varchar('role_dscr', { length: 100 }),
    isDistrictStaff: boolean('is_district_staff').default(false),
    phone: varchar({ length: 30 }),
  },
  (table) => [unique('contacts_email_key').on(table.email)],
);

export const stagingMessage = pgTable(
  'staging_message',
  {
    externalId: varchar('external_id', { length: 20 }),
    stage: importStageType(),
    id: uuid().primaryKey().notNull(),
    // TODO: failed to parse database type 'email_message_type'
    // message: unknown('message'),
    userId: integer("user_id"),
  },
  (table) => [
    index('fki_fk_staging_message_users').using(
      'btree',
      table.userId.asc().nullsLast().op('int4_ops'),
    ),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: 'fk_staging_message_users',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
    unique('staging_message_external_id_key').on(table.externalId),
  ],
);

export const legalReferences = pgTable(
  'legal_references',
  {
    referenceId: serial('reference_id').primaryKey().notNull(),
    caseName: varchar('case_name', { length: 255 }).notNull(),
    source: varchar({ length: 255 }).notNull(),
    policyId: integer('policy_id'),
    summary: text().notNull(),
    url: text(),
  },
  (table) => [
    foreignKey({
      columns: [table.policyId],
      foreignColumns: [policiesStatutes.policyId],
      name: 'legal_references_policy_id_fkey',
    }).onDelete('cascade'),
  ],
);

export const policyTypes = pgTable(
  'policy_types',
  {
    policyTypeId: serial('policy_type_id').primaryKey().notNull(),
    typeName: varchar('type_name', { length: 50 }).notNull(),
  },
  (table) => [unique('policy_types_type_name_key').on(table.typeName)],
);

export const complianceScoresDetails = pgTable(
  'compliance_scores_details',
  {
    propertyId: uuid('property_id').primaryKey().notNull(),
    actionPropertyId: uuid('action_property_id'),
    complianceScore: integer('compliance_score'),
    violationsFound: integer('violations_found').default(0),
    responseDelayDays: integer('response_delay_days').default(0),
    overallGrade: varchar('overall_grade', { length: 10 }),
    evaluatedOn: timestamp('evaluated_on', { mode: 'string' }).default(
      sql`CURRENT_TIMESTAMP`,
    ),
    attachmentId: integer('attachment_id'),
  },
  (table) => [
    index('idx_compliance_scores_action_property_id').using(
      'btree',
      table.actionPropertyId.asc().nullsLast().op('uuid_ops'),
    ),
    index('idx_compliance_scores_evaluated_on').using(
      'btree',
      table.evaluatedOn.asc().nullsLast().op('timestamp_ops'),
    ),
    foreignKey({
      columns: [table.attachmentId],
      foreignColumns: [emailAttachments.attachmentId],
      name: 'compliance_scores_attachment_fk',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.actionPropertyId],
      foreignColumns: [documentProperty.propertyId],
      name: 'compliance_scores_details_action_property_id_fkey',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.propertyId],
      foreignColumns: [documentProperty.propertyId],
      name: 'compliance_scores_details_property_id_fkey',
    }).onDelete('cascade'),
  ],
);

export const emailSentimentAnalysisDetails = pgTable(
  'email_sentiment_analysis_details',
  {
    propertyId: uuid('property_id').primaryKey().notNull(),
    sentimentScore: integer('sentiment_score'),
    detectedHostility: boolean('detected_hostility').default(false),
    flaggedPhrases: text('flagged_phrases'),
    detectedOn: timestamp('detected_on', { mode: 'string' }).default(
      sql`CURRENT_TIMESTAMP`,
    ),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    attachmentId: bigint('attachment_id', { mode: 'number' }),
  },
  (table) => [
    index('idx_email_sentiment_analysis_detected_on').using(
      'btree',
      table.detectedOn.asc().nullsLast().op('timestamp_ops'),
    ),
    index('idx_email_sentiment_analysis_sentiment_score').using(
      'btree',
      table.sentimentScore.asc().nullsLast().op('int4_ops'),
    ),
    foreignKey({
      columns: [table.attachmentId],
      foreignColumns: [emailAttachments.attachmentId],
      name: 'email_sentiment_analysis_attachment',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.propertyId],
      foreignColumns: [documentProperty.propertyId],
      name: 'email_sentiment_analysis_details_property_id_fkey',
    }).onDelete('cascade'),
  ],
);

export const emails = pgTable(
  'emails',
  {
    senderId: integer('sender_id').notNull(),
    threadId: integer('thread_id'),
    subject: text().notNull(),
    emailContents: text('email_contents').notNull(),
    sentTimestamp: timestamp('sent_timestamp', { mode: 'string' }).default(
      sql`CURRENT_TIMESTAMP`,
    ),
    importedFromId: varchar('imported_from_id', { length: 20 }),
    globalMessageId: varchar('global_message_id', { length: 255 }),
    emailId: uuid('email_id').defaultRandom().primaryKey().notNull(),
    parentId: uuid('parent_id'),
    documentType: text('document_type').generatedAlwaysAs(sql`'email'::text`),
  },
  (table) => [
    index('fki_fk_emails_parent_email').using(
      'btree',
      table.parentId.asc().nullsLast().op('uuid_ops'),
    ),
    index('idx_emails_parent').using(
      'btree',
      table.parentId.asc().nullsLast().op('uuid_ops'),
    ),
    uniqueIndex('idx_emails_unique_desc').using(
      'btree',
      table.threadId.desc().nullsFirst().op('uuid_ops'),
      table.senderId.desc().nullsFirst().op('uuid_ops'),
      table.parentId.desc().nullsFirst().op('int4_ops'),
      table.emailId.desc().nullsFirst().op('uuid_ops'),
    ),
    foreignKey({
      columns: [table.senderId],
      foreignColumns: [contacts.contactId],
      name: 'emails_relation_1',
    }),
    foreignKey({
      columns: [table.parentId],
      foreignColumns: [table.emailId],
      name: 'fk_emails_parent_email',
    })
      .onUpdate('cascade')
      .onDelete('set null'),
  ],
);

export const policiesStatutes = pgTable(
  'policies_statutes',
  {
    policyId: serial('policy_id').primaryKey().notNull(),
    policyTypeId: integer('policy_type_id').notNull(),
    chapter: varchar({ length: 50 }),
    section: varchar({ length: 50 }),
    paragraph: text(),
    description: text(),
    indexedFileId: text('indexed_file_id'),
  },
  (table) => [
    foreignKey({
      columns: [table.policyTypeId],
      foreignColumns: [policyTypes.policyTypeId],
      name: 'policies_statutes_policy_type_id_fkey',
    }).onDelete('cascade'),
    unique('indexed_file_id_unique').on(table.indexedFileId),
  ],
);

export const violationDetails = pgTable(
  'violation_details',
  {
    propertyId: uuid('property_id').primaryKey().notNull(),
    emailDocumentId: integer('email_document_id').notNull(),
    violationType: text('violation_type').notNull(),
    severityLevel: integer('severity_level').notNull(),
    detectedBy: varchar('detected_by', { length: 255 })
      .default('AI-System')
      .notNull(),
    detectedOn: timestamp('detected_on', { mode: 'string' })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    violationReasons: text('violation_reasons').array().notNull(),
    titleIxRelevancy: doublePrecision('title_ix_relevancy').notNull(),
    chapt13Relevancy: doublePrecision('chapt_13_relevancy').notNull(),
    ferpaRelevancy: doublePrecision('ferpa_relevancy').notNull(),
    otherRelevancy: jsonb('other_relevancy'),
    severityReasons: text('severity_reasons').array(),
  },
  (table) => [
    index('idx_violation_details_attachment_id').using(
      'btree',
      table.emailDocumentId.asc().nullsLast().op('int4_ops'),
    ),
    index('idx_violation_details_detected_on').using(
      'btree',
      table.detectedOn.asc().nullsLast().op('timestamp_ops'),
    ),
    foreignKey({
      columns: [table.emailDocumentId],
      foreignColumns: [documentUnits.unitId],
      name: 'violation_email',
    }).onDelete('cascade'),
  ],
);

export const callToActionDetails = pgTable(
  'call_to_action_details',
  {
    propertyId: uuid('property_id').primaryKey().notNull(),
    openedDate: date('opened_date').notNull(),
    closedDate: date('closed_date'),
    compliancyCloseDate: date('compliancy_close_date'),
    completionPercentage: numeric('completion_percentage', {
      precision: 5,
      scale: 2,
    })
      .default('0.0')
      .notNull(),
    inferred: boolean().default(false).notNull(),
    complianceDateEnforceable: boolean('compliance_date_enforceable')
      .default(false)
      .notNull(),
    reasonableRequest: integer('reasonable_request'),
    reasonableReasons: text('reasonable_reasons'),
    closureActions: text('closure_actions').array().notNull(),
    complianceRating: doublePrecision('compliance_rating'),
    complianceRatingReasons: text('compliance_rating_reasons').array(),
    sentiment: doublePrecision().notNull(),
    sentimentReasons: text('sentiment_reasons').array().notNull(),
    severity: integer().notNull(),
    severityReason: text('severity_reason').array().notNull(),
    titleIxApplicable: integer('title_ix_applicable').notNull(),
    titleIxApplicableReasons: text('title_ix_applicable_reasons')
      .array()
      .notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.propertyId],
      foreignColumns: [documentProperty.propertyId],
      name: 'call_to_action_details_property_id_fkey',
    }).onDelete('cascade'),
  ],
);

export const keyPointsDetails = pgTable(
  'key_points_details',
  {
    propertyId: uuid('property_id').primaryKey().notNull(),
    relevance: doublePrecision().notNull(),
    compliance: doublePrecision().notNull(),
    severityRanking: integer('severity_ranking').default(sql`'-1'`),
    inferred: boolean().default(false).notNull(),
    complianceReasons: text('compliance_reasons').array(),
  },
  (table) => [
    foreignKey({
      columns: [table.propertyId],
      foreignColumns: [documentProperty.propertyId],
      name: 'key_points_details_property_id_fkey',
    }).onDelete('cascade'),
  ],
);

export const callToActionResponseDetails = pgTable(
  'call_to_action_response_details',
  {
    propertyId: uuid('property_id').primaryKey().notNull(),
    responseTimestamp: timestamp('response_timestamp', {
      mode: 'string',
    }).default(sql`CURRENT_TIMESTAMP`),
    reasonableReasons: text('reasonable_reasons'),
    severity: integer(),
    inferred: boolean(),
    complianceRating: doublePrecision('compliance_rating'),
    complianceReasons: text('compliance_reasons'),
    reasonableResponse: integer('reasonable_response'),
    sentiment: doublePrecision(),
    sentimentReasons: text('sentiment_reasons').array(),
    severityReasons: text('severity_reasons').array(),
  },
  (table) => [
    index('idx_call_to_action_response_timestamp').using(
      'btree',
      table.responseTimestamp.asc().nullsLast().op('timestamp_ops'),
    ),
    foreignKey({
      columns: [table.propertyId],
      foreignColumns: [documentProperty.propertyId],
      name: 'call_to_action_response_details_property_id_fkey',
    }).onDelete('cascade'),
  ],
);

export const users = pgTable('users', {
  id: serial().primaryKey().notNull(),
  name: varchar({ length: 255 }),
  email: varchar({ length: 255 }),
  emailVerified: timestamp({ withTimezone: true, mode: 'string' }),
  image: text(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }),
});

export const documentPropertyCallToActionCategory = pgTable(
  'document_property_call_to_action_category',
  {
    propertyId: uuid('property_id').notNull(),
    ctaCategoryId: uuid('cta_category_id').notNull(),
    createdOn: timestamp('created_on', { mode: 'string' }).default(
      sql`CURRENT_TIMESTAMP`,
    ),
  },
  (table) => [
    foreignKey({
      columns: [table.ctaCategoryId],
      foreignColumns: [callToActionCategory.ctaCategoryId],
      name: 'fk_call_to_action_cateogry_id',
    }),
    foreignKey({
      columns: [table.propertyId],
      foreignColumns: [callToActionDetails.propertyId],
      name: 'fk_call_to_action_details_to_category',
    }),
    foreignKey({
      columns: [table.propertyId],
      foreignColumns: [documentProperty.propertyId],
      name: 'fk_cta_category_document_property',
    }).onDelete('cascade'),
    primaryKey({
      columns: [table.propertyId, table.ctaCategoryId],
      name: 'document_property_call_to_action_category_pkey',
    }),
  ],
);

export const chatTurnMessageSequences = pgTable(
  'chat_turn_message_sequences',
  {
    chatId: text('chat_id').notNull(),
    turnId: integer('turn_id').notNull(),
    lastMessageId: integer('last_message_id').default(0).notNull(),
  },
  (table) => [
    primaryKey({
      columns: [table.chatId, table.turnId],
      name: 'chat_turn_message_sequences_pkey',
    }),
  ],
);

export const documentUnitAnalysisStageIgnore = pgTable(
  'document_unit_analysis_stage_ignore',
  {
    documentId: integer('document_id').notNull(),
    analysisStageId: integer('analysis_stage_id').notNull(),
    reason: text(),
  },
  (table) => [
    primaryKey({
      columns: [table.documentId, table.analysisStageId],
      name: 'document_unit_analysis_stage_ignore_pkey',
    }),
  ],
);

export const verificationTokens = pgTable(
  'verification_tokens',
  {
    identifier: text().notNull(),
    token: text().notNull(),
    expires: timestamp({ withTimezone: true, mode: 'string' }).notNull(),
  },
  (table) => [
    primaryKey({
      columns: [table.identifier, table.token],
      name: 'verification_tokens_pkey',
    }),
  ],
);

export const emailRecipients = pgTable(
  'email_recipients',
  {
    recipientId: integer('recipient_id').notNull(),
    emailId: uuid('email_id').notNull(),
    recipientType: recipientType('recipient_type').default('to').notNull(),
  },
  (table) => [
    index('fki_email_recipients_email_id_fkey').using(
      'btree',
      table.emailId.asc().nullsLast().op('uuid_ops'),
    ),
    foreignKey({
      columns: [table.emailId],
      foreignColumns: [emails.emailId],
      name: 'email_recipients_email_id_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
    foreignKey({
      columns: [table.recipientId],
      foreignColumns: [contacts.contactId],
      name: 'email_recipients_recipient_id_fkey',
    }).onDelete('cascade'),
    primaryKey({
      columns: [table.recipientId, table.emailId],
      name: 'email_recipients_pkey',
    }),
  ],
);

export const documentPropertyRelatedDocumentOld = pgTable(
  'document_property_related_document_old',
  {
    relatedPropertyId: uuid('related_property_id').notNull(),
    documentId: integer('document_id').notNull(),
    relationshipType: integer('relationship_type').notNull(),
    timestamp: time().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    foreignKey({
      columns: [table.documentId],
      foreignColumns: [documentUnits.unitId],
      name: 'fk_document',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.relatedPropertyId],
      foreignColumns: [documentProperty.propertyId],
      name: 'fk_property',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.relationshipType],
      foreignColumns: [documentRelationshipReason.relationReasonId],
      name: 'fk_relation',
    }).onDelete('cascade'),
    primaryKey({
      columns: [
        table.relatedPropertyId,
        table.documentId,
        table.relationshipType,
      ],
      name: 'document_property_related_document_pkey',
    }),
  ],
);

export const documentUnitEmbeddings = pgTable(
  'document_unit_embeddings',
  {
    documentId: integer('document_id').notNull(),
    index: integer().notNull(),
    // vector: vector().notNull(),
    createdOn: time('created_on').default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    foreignKey({
      columns: [table.documentId],
      foreignColumns: [documentUnits.unitId],
      name: 'fk_document_unit',
    }).onDelete('cascade'),
    primaryKey({
      columns: [table.documentId, table.index],
      name: 'document_unit_vector_store_pkey',
    }),
  ],
);

export const documentRelationship = pgTable(
  'document_relationship',
  {
    sourceDocumentId: integer('source_document_id').notNull(),
    targetDocumentId: integer('target_document_id').notNull(),
    relationshipReasonId: integer('relationship_reason_id').notNull(),
    timestamp: timestamp({ mode: 'string' })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.relationshipReasonId],
      foreignColumns: [documentRelationshipReason.relationReasonId],
      name: 'fk_relation',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.sourceDocumentId],
      foreignColumns: [documentUnits.unitId],
      name: 'fk_source',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.targetDocumentId],
      foreignColumns: [documentUnits.unitId],
      name: 'fk_target',
    }).onDelete('cascade'),
    primaryKey({
      columns: [
        table.sourceDocumentId,
        table.targetDocumentId,
        table.relationshipReasonId,
      ],
      name: 'document_relationship_pkey',
    }),
  ],
);

export const tokenUsage = pgTable(
  'token_usage',
  {
    chatId: text('chat_id').notNull(),
    turnId: integer('turn_id').notNull(),
    promptTokens: integer('prompt_tokens'),
    completionTokens: integer('completion_tokens'),
    totalTokens: integer('total_tokens'),
  },
  (table) => [
    foreignKey({
      columns: [table.chatId, table.turnId],
      foreignColumns: [chatTurns.chatId, chatTurns.turnId],
      name: 'token_usage_chat_id_turn_id_fkey',
    }).onDelete('cascade'),
    primaryKey({
      columns: [table.chatId, table.turnId],
      name: 'token_usage_pkey',
    }),
  ],
);

// New tables for token consumption statistics and quota management

// Providers table to centralize AI provider information
export const providers = pgTable(
  'providers',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    name: text().notNull(), // 'azure', 'google', 'openai', etc.
    displayName: text('display_name').notNull(), // 'Azure OpenAI', 'Google AI', etc.
    description: text(), // Optional provider description
    baseUrl: text('base_url'), // Optional base URL for API calls
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).defaultNow(),
  },
  (table) => [
    // Ensure unique provider names
    unique('providers_name_unique').on(table.name),
    index('idx_providers_name').using('btree', table.name.asc().nullsLast().op('text_ops')),
    index('idx_providers_active').using('btree', table.isActive.asc().nullsLast().op('bool_ops')),
  ],
);

// Normalized models table to centralize provider+model combinations
export const models = pgTable(
  'models',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    providerId: uuid('provider_id').notNull(), // Reference to providers table
    modelName: text('model_name').notNull(), // 'hifi', 'lofi', 'gemini-pro', etc.
    displayName: text('display_name'), // Optional human-readable name
    description: text(), // Optional model description
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).defaultNow(),
  },
  (table) => [
    // Ensure unique provider/model combination
    unique('models_provider_model_unique').on(table.providerId, table.modelName),
    index('idx_models_provider_id').using('btree', table.providerId.asc().nullsLast().op('uuid_ops')),
    index('idx_models_model_name').using('btree', table.modelName.asc().nullsLast().op('text_ops')),
    index('idx_models_active').using('btree', table.isActive.asc().nullsLast().op('bool_ops')),
    foreignKey({
      columns: [table.providerId],
      foreignColumns: [providers.id],
      name: 'models_provider_id_fkey',
    }).onDelete('cascade'),
  ],
);

export const modelQuotas = pgTable(
  'model_quotas',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    modelId: uuid('model_id').notNull(), // Reference to models table
    maxTokensPerMessage: integer('max_tokens_per_message'), // Per-message limit
    maxTokensPerMinute: integer('max_tokens_per_minute'), // Rate limit
    maxTokensPerDay: integer('max_tokens_per_day'), // Daily quota
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).defaultNow(),
    isActive: boolean('is_active').default(true).notNull(),
  },
  (table) => [
    // Ensure unique quota configuration per model
    unique('model_quotas_model_unique').on(table.modelId),
    index('idx_model_quotas_model_id').using('btree', table.modelId.asc().nullsLast().op('uuid_ops')),
    index('idx_model_quotas_active').using('btree', table.isActive.asc().nullsLast().op('bool_ops')),
    foreignKey({
      columns: [table.modelId],
      foreignColumns: [models.id],
      name: 'model_quotas_model_id_fkey',
    }).onDelete('cascade'),
  ],
);

export const tokenConsumptionStats = pgTable(
  'token_consumption_stats',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    modelId: uuid('model_id').notNull(), // Reference to models table
    windowStart: timestamp('window_start', { withTimezone: true, mode: 'string' }).notNull(),
    windowEnd: timestamp('window_end', { withTimezone: true, mode: 'string' }).notNull(),
    windowType: text('window_type').notNull(), // 'minute', 'hour', 'day'
    promptTokens: integer('prompt_tokens').default(0).notNull(),
    completionTokens: integer('completion_tokens').default(0).notNull(),
    totalTokens: integer('total_tokens').default(0).notNull(),
    requestCount: integer('request_count').default(0).notNull(),
    lastUpdated: timestamp('last_updated', { withTimezone: true, mode: 'string' }).defaultNow(),
  },
  (table) => [
    // Ensure unique stats per model/window combination
    unique('token_stats_model_window_unique').on(
      table.modelId, 
      table.windowStart, 
      table.windowType
    ),
    index('idx_token_stats_model_id').using('btree', table.modelId.asc().nullsLast().op('uuid_ops')),
    index('idx_token_stats_window_start').using('btree', table.windowStart.asc().nullsLast().op('timestamptz_ops')),
    index('idx_token_stats_window_type').using('btree', table.windowType.asc().nullsLast().op('text_ops')),
    index('idx_token_stats_last_updated').using('btree', table.lastUpdated.asc().nullsLast().op('timestamptz_ops')),
    // Check constraint for valid window types
    check(
      'token_stats_window_type_check',
      sql`window_type IN ('minute', 'hour', 'day')`,
    ),
    foreignKey({
      columns: [table.modelId],
      foreignColumns: [models.id],
      name: 'token_consumption_stats_model_id_fkey',
    }).onDelete('cascade'),
  ],
);

export const documentUnitAnalysisFunctionAudit = pgTable(
  'document_unit_analysis_function_audit',
  {
    analysisAuditId: integer('analysis_audit_id').notNull(),
    functionNum: integer('function_num').notNull(),
    name: text(),
    arguments: text(),
    result: text(),
  },
  (table) => [
    foreignKey({
      columns: [table.analysisAuditId],
      foreignColumns: [documentUnitAnalysisStageAudit.analysisAuditId],
      name: 'fk_document_analysis_stage_audit',
    }).onDelete('cascade'),
    primaryKey({
      columns: [table.analysisAuditId, table.functionNum],
      name: 'document_unit_analysis_function_audit_pkey',
    }),
  ],
);

export const callToActionDetailsCallToActionResponse = pgTable(
  'call_to_action_details_call_to_action_response',
  {
    callToActionId: uuid('call_to_action_id').notNull(),
    callToActionResponseId: uuid('call_to_action_response_id').notNull(),
    complianceChapter13: doublePrecision('compliance_chapter_13'),
    complianceChapter13Reasons: text('compliance_chapter_13_reasons').array(),
    completionPercentage: doublePrecision('completion_percentage'),
    completionPercentageReasons: text('completion_percentage_reasons').array(),
    timestamp: timestamp({ mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    foreignKey({
      columns: [table.callToActionId],
      foreignColumns: [callToActionDetails.propertyId],
      name: 'fk_call_to_action_details',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.callToActionResponseId],
      foreignColumns: [callToActionResponseDetails.propertyId],
      name: 'fk_call_to_action_response',
    }).onDelete('cascade'),
    primaryKey({
      columns: [table.callToActionId, table.callToActionResponseId],
      name: 'call_to_action_details_call_to_action_response_pkey',
    }),
  ],
);

export const stagingAttachment = pgTable(
  'staging_attachment',
  {
    stagingMessageId: uuid('staging_message_id').notNull(),
    partId: numeric({ precision: 4, scale: 2 }).notNull(),
    mimeType: varchar({ length: 255 }),
    storageId: varchar({ length: 2048 }),
    imported: boolean().default(false).notNull(),
    size: integer().default(0).notNull(),
    attachmentId: text(),
    filename: text(),
  },
  (table) => [
    foreignKey({
      columns: [table.stagingMessageId],
      foreignColumns: [stagingMessage.id],
      name: 'fk_staging_attachment_staging_message',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
    primaryKey({
      columns: [table.stagingMessageId, table.partId],
      name: 'pk_staging_attachment',
    }),
  ],
);

export const chatMessages = pgTable(
  'chat_messages',
  {
    chatId: text('chat_id').notNull(),
    turnId: integer('turn_id').notNull(),
    messageId: integer('message_id').notNull(),
    role: text().notNull(),
    content: text(),
    toolName: text('tool_name'),
    functionCall: jsonb('function_call'),
    toolResult: jsonb('tool_result'),
    messageOrder: integer('message_order').notNull(),
    statusId: smallint('status_id').notNull(),
    providerId: text('provider_id'),
    metadata: jsonb(),
    toolInstanceId: uuid('tool_instance_id'),
    optimizedContent: text('optimized_content'),
    messageTimestamp: timestamp('message_timestamp', { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index('idx_messages_provider_id').using(
      'btree',
      table.providerId.asc().nullsLast().op('text_ops'),
    ),
    index('idx_messages_status_id').using(
      'btree',
      table.statusId.asc().nullsLast().op('int2_ops'),
    ),
    index('idx_messages_tool_instance_id').using(
      'btree',
      table.toolInstanceId.asc().nullsLast().op('uuid_ops'),
    ),
    foreignKey({
      columns: [table.chatId, table.turnId],
      foreignColumns: [chatTurns.chatId, chatTurns.turnId],
      name: 'chat_messages_chat_id_turn_id_fkey',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.statusId],
      foreignColumns: [messageStatuses.id],
      name: 'chat_messages_status_id_fkey',
    }),
    primaryKey({
      columns: [table.chatId, table.turnId, table.messageId],
      name: 'chat_messages_pkey',
    }),
    check(
      'chat_messages_role_check',
      sql`role = ANY (ARRAY['user'::text, 'assistant'::text, 'tool'::text, 'system'::text])`,
    ),
  ],
);

export const chatTurns = pgTable(
  'chat_turns',
  {
    chatId: text('chat_id').notNull(),
    turnId: integer('turn_id').notNull(),
    statusId: smallint('status_id').notNull(),
    createdAt: timestamp('created_at', {
      withTimezone: true,
      mode: 'string',
    }).defaultNow(),
    completedAt: timestamp('completed_at', {
      withTimezone: true,
      mode: 'string',
    }),
    modelName: text('model_name'),
    temperature: real(),
    topP: real('top_p'),
    latencyMs: integer('latency_ms'),
    warnings: text().array(),
    errors: text().array(),
    metadata: jsonb(),
    providerId: text('provider_id'),
    optimizedPromtpAssistant: text('optimized_prompt_assistant'),
    optimizedPromptUser: text('optimized_prompt_user'),
    optimizedToolResults: text('optimized_tool_results'),
  },
  (table) => [
    index('idx_turns_created_at').using(
      'btree',
      table.createdAt.asc().nullsLast().op('timestamptz_ops'),
    ),
    index('idx_turns_provider_id').using(
      'btree',
      table.providerId.asc().nullsLast().op('text_ops'),
    ),
    index('idx_turns_status_id').using(
      'btree',
      table.statusId.asc().nullsLast().op('int2_ops'),
    ),
    foreignKey({
      columns: [table.chatId],
      foreignColumns: [chats.id],
      name: 'chat_turns_chat_id_fkey',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.statusId],
      foreignColumns: [turnStatuses.id],
      name: 'chat_turns_status_id_fkey',
    }),
    primaryKey({
      columns: [table.chatId, table.turnId],
      name: 'chat_turns_pkey',
    }),
  ],
);
export const callToAction = pgView('CallToAction', {
  propertyId: uuid('property_id'),
  actionPropertyId: uuid('action_property_id'),
  openedDate: date('opened_date'),
  closedDate: date('closed_date'),
  compliancyCloseDate: date('compliancy_close_date'),
  completionPercentage: numeric('completion_percentage', {
    precision: 5,
    scale: 2,
  }),
  actionDescription: text('action_description'),
  responseTimestamp: timestamp('response_timestamp', { mode: 'string' }),
  documentId: integer('document_id'),
  inferred: boolean(),
  complianceDateEnforceable: boolean('compliance_date_enforceable'),
  complianceAggregateReasons: text('compliance_aggregate_reasons'),
  tags: text(),
  policyBasis: text('policy_basis'),
}).as(
  sql`SELECT cta.property_id, cta.property_id AS action_property_id, cta.opened_date, cta.closed_date, cta.compliancy_close_date, cta.completion_percentage, dp.property_value AS action_description, ae.sent_timestamp AS response_timestamp, dp.document_id, cta.inferred, cta.compliance_date_enforceable, 'Initial action request'::text AS compliance_aggregate_reasons, dp.tags, dp.policy_basis FROM document_property dp JOIN call_to_action_details cta ON dp.property_id = cta.property_id JOIN document_units d ON d.unit_id = dp.document_id JOIN emails ae ON ae.email_id = d.email_id`,
);

export const responsiveAction = pgView('ResponsiveAction', {
  callToActionId: uuid('call_to_action_id'),
  callToActionSourceDocumentId: integer('call_to_action_source_document_id'),
  responsiveActionId: uuid('responsive_action_id'),
  responsiveActionSourceDocumentId: integer(
    'responsive_action_source_document_id',
  ),
  requestContents: text('request_contents'),
  responseContents: text('response_contents'),
  requestInferred: boolean('request_inferred'),
  responseInferred: boolean('response_inferred'),
  requestCompletionPercentage: numeric('request_completion_percentage', {
    precision: 5,
    scale: 2,
  }),
  responseCompletionPercentage: doublePrecision(
    'response_completion_percentage',
  ),
  responseCompletionPercentageReasons: text(
    'response_completion_percentage_reasons',
  ),
  requestOpenedDate: date('request_opened_date'),
  requestCompliancyDeadline: date('request_compliancy_deadline'),
  enforceableComplianceDate: boolean('enforceable_compliance_date'),
  requestClosedDate: date('request_closed_date'),
  responseDate: timestamp('response_date', { mode: 'string' }),
  responseDaysUntilDeadline: interval('response_days_until_deadline'),
  requestSeverity: integer('request_severity'),
  requestSeverityReason: text('request_severity_reason'),
  titleIxApplicable: integer('title_ix_applicable'),
  titleIxApplicableReasons: text('title_ix_applicable_reasons'),
  complianceChapter13: doublePrecision('compliance_chapter_13'),
  complianceChapter13Reasons: text('compliance_chapter_13_reasons'),
  responseSeverity: integer('response_severity'),
  responseSeverityReason: text('response_severity_reason'),
  relatedDocuments: integer('related_documents'),
}).as(
  sql`SELECT cta.property_id AS call_to_action_id, dp_cta.document_id AS call_to_action_source_document_id, ra.property_id AS responsive_action_id, dp_ra.document_id AS responsive_action_source_document_id, dp_cta.property_value AS request_contents, dp_ra.property_value AS response_contents, cta.inferred AS request_inferred, ra.inferred AS response_inferred, cta.completion_percentage AS request_completion_percentage, lnk.completion_percentage AS response_completion_percentage, lnk.completion_percentage_reasons AS response_completion_percentage_reasons, cta.opened_date AS request_opened_date, cta.compliancy_close_date AS request_compliancy_deadline, cta.compliance_date_enforceable AS enforceable_compliance_date, cta.closed_date AS request_closed_date, ra.response_timestamp AS response_date, cta.compliancy_close_date::timestamp with time zone - COALESCE(ra.response_timestamp::timestamp with time zone, CURRENT_TIMESTAMP) AS response_days_until_deadline, cta.severity AS request_severity, cta.severity_reason AS request_severity_reason, cta.title_ix_applicable, cta.title_ix_applicable_reasons, lnk.compliance_chapter_13, lnk.compliance_chapter_13_reasons, ra.severity AS response_severity, ra.severity_reasons AS response_severity_reason, ARRAY( SELECT rd.document_id FROM document_property_related_document_old rd WHERE rd.related_property_id = cta.property_id OR rd.related_property_id = ra.property_id) AS related_documents FROM call_to_action_details cta JOIN document_property dp_cta ON cta.property_id = dp_cta.property_id LEFT JOIN call_to_action_details_call_to_action_response lnk ON cta.property_id = lnk.call_to_action_id LEFT JOIN call_to_action_response_details ra ON lnk.call_to_action_response_id = ra.property_id LEFT JOIN document_property dp_ra ON ra.property_id = dp_ra.property_id ORDER BY dp_cta.created_on, ra.response_timestamp`,
);

export const keyPoints = pgView('KeyPoints', {
  documentId: integer('document_id'),
  documentType: varchar('document_type', { length: 50 }),
  emailId: uuid('email_id'),
  emailPropertyCategoryId: integer('email_property_category_id'),
  categoryName: varchar('category_name', { length: 50 }),
  documentPropertyTypeId: integer('document_property_type_id'),
  propertyName: varchar('property_name', { length: 100 }),
  propertyValue: text('property_value'),
  sentTimestamp: timestamp('sent_timestamp', { mode: 'string' }),
  subject: text(),
  senderId: integer('sender_id'),
  name: varchar({ length: 255 }),
  relevance: doublePrecision(),
  compliance: doublePrecision(),
  severityRanking: integer('severity_ranking'),
  inferred: boolean(),
  policyBasis: text('policy_basis'),
  tags: text(),
  propertyId: uuid('property_id'),
}).as(
  sql`SELECT dp.document_id, du.document_type, du.email_id, ec.email_property_category_id, ec.description AS category_name, et.document_property_type_id, et.property_name, dp.property_value, e.sent_timestamp, e.subject, e.sender_id, c.name, kpd.relevance, kpd.compliance, kpd.severity_ranking, kpd.inferred, dp.policy_basis, dp.tags, dp.property_id FROM key_points_details kpd JOIN document_property dp ON kpd.property_id = dp.property_id JOIN document_units du ON dp.document_id = du.unit_id JOIN emails e ON du.email_id = e.email_id JOIN contacts c ON e.sender_id = c.contact_id JOIN email_property_type et ON dp.document_property_type_id = et.document_property_type_id JOIN email_property_category ec ON et.email_property_category_id = ec.email_property_category_id`,
);

export const emailProperty = pgView('email_property', {
  propertyValue: text('property_value'),
  documentPropertyTypeId: integer('document_property_type_id'),
  propertyId: uuid('property_id'),
  emailId: uuid('email_id'),
  createdOn: timestamp('created_on', { mode: 'string' }),
}).as(
  sql`SELECT dp.property_value, dp.document_property_type_id, dp.property_id, d.email_id, dp.created_on FROM document_property dp JOIN document_units d ON dp.document_id = d.unit_id`,
);

export const documentWithDetails = pgView('DocumentWithDetails', {
  documentId: integer('document_id'),
  emailId: uuid('email_id'),
  attachmentId: integer('attachment_id'),
  propertyId: uuid('property_id'),
  content: text(),
  documentType: varchar('document_type', { length: 50 }),
  embeddingModel: varchar('embedding_model', { length: 255 }),
  embeddedOn: timestamp('embedded_on', { mode: 'string' }),
  createdOn: timestamp('created_on', { mode: 'string' }),
  sender: varchar({ length: 255 }),
  senderRole: varchar('sender_role', { length: 100 }),
  isFromDistrictStaff: boolean('is_from_district_staff'),
  subject: text(),
  documentSendDate: timestamp('document_send_date', { mode: 'string' }),
  threadId: integer('thread_id'),
  filePath: text('file_path'),
  replyToDocumentId: integer('reply_to_document_id'),
  relatedDocuments: integer('related_documents'),
  attachments: integer(),
}).as(
  sql`SELECT d.unit_id AS document_id, d.email_id, d.attachment_id, d.document_property_id AS property_id, d.content, d.document_type, d.embedding_model, d.embedded_on, d.created_on, c.name AS sender, c.role_dscr AS sender_role, c.is_district_staff AS is_from_district_staff, e.subject, e.sent_timestamp AS document_send_date, e.thread_id, a.file_path, email_is_replyto_document(e.email_id) AS reply_to_document_id, ( SELECT array_agg(rd.document_id) AS array_agg FROM email_related_emails(e.email_id, true, true) rd(email_id, global_message_id, document_id) WHERE rd.document_id IS NOT NULL) AS related_documents, ( SELECT array_agg(du.unit_id) AS array_agg FROM email_attachments att JOIN document_units du ON att.attachment_id = du.attachment_id WHERE att.email_id = d.email_id) AS attachments FROM document_units d JOIN emails e ON d.email_id = e.email_id JOIN contacts c ON e.sender_id = c.contact_id LEFT JOIN email_attachments a ON d.attachment_id = a.attachment_id`,
);

export const documentPropertyRelatedDocument = pgMaterializedView(
  'document_property_related_document',
  {
    relatedPropertyId: uuid('related_property_id'),
    documentId: integer('document_id'),
    relationshipType: integer('relationship_type'),
    timestamp: timestamp({ mode: 'string' }),
  },
).as(
  sql`SELECT du.document_property_id AS related_property_id, dpr.target_document_id AS document_id, dpr.relationship_reason_id AS relationship_type, dpr."timestamp" FROM document_relationship dpr JOIN document_units du ON dpr.source_document_id = du.unit_id`,
);
