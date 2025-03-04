import {
  ImportSourceMessage,
  ImportStage,
} from '@/data-models/api/import/email-message';
import { ContactRepository } from '@/lib/api/contacts/database';
import { EmailRepository } from '@/lib/api/email/database';
import { ThreadRepository } from '@/lib/api/thread/database';
import { NextRequest } from 'next/server';

/**
 * Represents the context for processing a specific stage in the import process.
 *
 * @type {Object} StageProcessorContext
 * @property {string} providerEmailId - The provider identifier for the email source.
 * @property {ImportSourceMessage} target - The target of the import.
 * @property {ImportStage} currentStage - The current stage of the import process.
 * @property {ImportStage} nextStage - The next stage of the import process.
 * @property {number} accountId - The ID of the account associated with the import process.
 */
export type StageProcessorContext = {
  /**
   * Provider identifier for the email source.
   */
  providerEmailId: string;
  /**
   * Source email message.
   */
  target?: ImportSourceMessage;
  /**
   * Current stage of the import process.
   */
  currentStage: ImportStage;
  /**
   * Next stage of the import process.
   */
  nextStage: ImportStage;
  /**
   * Account ID associated with the import process.
   */
  accountId: number;
};

/**
 * Represents a manager for handling transactional import stages.
 */
export type TransactionalImportStageManager = {
  /**
   * Begins the transactional stage processing.
   *
   * @param target - The context for the current stage.
   * @returns A promise that resolves with the updated context after beginning the stage.
   */
  begin: (target: StageProcessorContext) => Promise<StageProcessorContext>;
  /**
   * Executes the transactional processing of the current stage.
   *
   * @param target - The context for the current stage.
   * @returns A promise that resolves with the updated context after running the stage.
   */
  run: (target: StageProcessorContext) => Promise<StageProcessorContext>;
  /**
   * Commits the transactional changes made during the stage processing.
   *
   * @param target - The context for the current stage.
   * @returns A promise that resolves with the updated context after committing the stage.
   */
  commit: (target: StageProcessorContext) => Promise<StageProcessorContext>;
  /**
   * Rolls back any changes made during the stage processing.
   *
   * @returns A promise that resolves when rollback has completed.
   */
  rollback: () => Promise<void>;
};

/**
 * Represents the context for processing a specific stage in the import process.
 */
export type AdditionalStageOptions = {
  req: NextRequest | null;
  threadRepository?: ThreadRepository;
  emailRepository?: EmailRepository;
  contactRepository?: ContactRepository;
};

/**
 * An array of string constants representing the key values for stage manager methods.
 *
 * - 'begin': Represents the beginning of a stage.
 * - 'commit': Represents the commitment of a stage.
 * - 'rollback': Represents the rollback of a stage.
 * - 'run': Represents the execution of a stage.
 */
export const StageManagerMethodKeyValues = [
  'begin',
  'commit',
  'rollback',
  'run',
] as const;

/**
 * A factory function type that creates a `TransactionalImportStageManager` for a given import stage.
 *
 * @template TStage - The type of the import stage, which extends `ImportStage`.
 * @param stage - The specific import stage for which the manager is being created.
 * @param param1 - An object containing the request information.
 * @param param1.req - The `NextRequest` object representing the HTTP request.
 * @param param1.additionalOption - Additional options for the stage manager (if any).
 * @returns A `TransactionalImportStageManager` instance for the specified import stage.
 */
export type ImportStageManagerFactory = (
  stage: ImportStage,
  { req }: AdditionalStageOptions
) => TransactionalImportStageManager;

/**
 * A map of import stages to their respective stage manager factories.
 */
export type ImportManagerMap = {
  [K in ImportStage]: ImportStageManagerFactory;
};
