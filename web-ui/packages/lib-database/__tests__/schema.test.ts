import { schema } from '../src/orm/schema';

describe('Database Schema', () => {
  describe('Schema Export', () => {
    it('should export a schema object', () => {
      expect(schema).toBeDefined();
      expect(typeof schema).toBe('object');
    });

    it('should contain table definitions', () => {
      // Check for some key tables
      expect(schema.users).toBeDefined();
      expect(schema.emails).toBeDefined();
      expect(schema.chatMessages).toBeDefined();
      expect(schema.documentUnits).toBeDefined();
    });

    it('should contain relations', () => {
      // Relations should be part of the schema
      expect(schema.usersRelations).toBeDefined();
      expect(schema.emailsRelations).toBeDefined();
      expect(schema.chatMessagesRelations).toBeDefined();
    });

    it('should contain enums', () => {
      expect(schema.recipientType).toBeDefined();
      expect(schema.importStageType).toBeDefined();
    });

    it('should have proper table structure', () => {
      // Users table should have expected properties
      const usersTable = schema.users;
      expect(usersTable).toBeDefined();
      expect(usersTable).toHaveProperty('_');
      
      // Check it's a Drizzle table
      const tableName = (usersTable as any)[Symbol.for('drizzle:Name')];
      expect(tableName).toBe('users');
    });

    it('should contain view definitions', () => {
      // Check for materialized views
      expect(schema.documentPropertyRelatedDocument).toBeDefined();
    });

    it('should have email-related tables', () => {
      expect(schema.emails).toBeDefined();
      expect(schema.emailAttachments).toBeDefined();
      expect(schema.emailRecipients).toBeDefined();
      expect(schema.documentProperty).toBeDefined();
    });

    it('should have chat-related tables', () => {
      expect(schema.chats).toBeDefined();
      expect(schema.chatMessages).toBeDefined();
      expect(schema.chatTurns).toBeDefined();
      expect(schema.chatToolCalls).toBeDefined();
      expect(schema.chatTool).toBeDefined();
    });

    it('should have authentication tables', () => {
      expect(schema.users).toBeDefined();
      expect(schema.accounts).toBeDefined();
      expect(schema.sessions).toBeDefined();
      expect(schema.userPublicKeys).toBeDefined();
    });

    it('should have analysis and property tables', () => {
      expect(schema.documentProperty).toBeDefined();
      expect(schema.callToActionDetails).toBeDefined();
      expect(schema.callToActionResponseDetails).toBeDefined();
      expect(schema.violationDetails).toBeDefined();
      expect(schema.complianceScoresDetails).toBeDefined();
      expect(schema.keyPointsDetails).toBeDefined();
    });

    it('should have model and provider tables', () => {
      expect(schema.providers).toBeDefined();
      expect(schema.models).toBeDefined();
      expect(schema.modelQuotas).toBeDefined();
      expect(schema.tokenUsage).toBeDefined();
    });

    it('should have staging tables', () => {
      expect(schema.stagingMessage).toBeDefined();
      expect(schema.stagingAttachment).toBeDefined();
    });

    it('should have contact tables', () => {
      expect(schema.contacts).toBeDefined();
    });
  });

  describe('Table Relations', () => {
    it('should define email relations correctly', () => {
      const emailsRelations = schema.emailsRelations;
      expect(emailsRelations).toBeDefined();
      expect(emailsRelations.config).toBeDefined();
    });

    it('should define user relations correctly', () => {
      const usersRelations = schema.usersRelations;
      expect(usersRelations).toBeDefined();
      expect(usersRelations.config).toBeDefined();
    });

    it('should define chat relations correctly', () => {
      const chatsRelations = schema.chatsRelations;
      expect(chatsRelations).toBeDefined();
      expect(chatsRelations.config).toBeDefined();
    });
  });

  describe('Enum Types', () => {
    it('should export recipient type enum', () => {
      const recipientType = schema.recipientType;
      expect(recipientType).toBeDefined();
      expect(recipientType.enumName).toBe('recipient_type');
    });

    it('should export import stage type enum', () => {
      const importStageType = schema.importStageType;
      expect(importStageType).toBeDefined();
      expect(importStageType.enumName).toBe('import_stage_type');
    });
  });
});
