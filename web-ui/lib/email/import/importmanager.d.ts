/**
 * Email import manager for orchestrating multi-stage import process
 * @module @/lib/email/import/importmanager
 */
import type { NextRequest } from 'next/server';
import type {
  ImportResponse,
  ImportSourceMessage,
} from '../../../data-models/api/import/email-message';

declare module '@/lib/email/import/importmanager' {
  /**
   * The `DefaultImportManager` class implements the `ImportManager` interface and provides
   * functionality to manage different stages of an import process.
   *
   * This class coordinates the multi-stage email import process, handling:
   * - Stage progression (new → staged → attachments → contacts → header → body → completed)
   * - Transaction management (begin → run → commit/rollback)
   * - OpenTelemetry tracing and metrics
   * - Error handling and retry logic
   *
   * @example
   * ```typescript
   * const manager = new DefaultImportManager('gmail');
   * const result = await manager.importEmail('email-id-123', { req });
   * if (result.success) {
   *   console.log('Import successful:', result.data);
   * }
   * ```
   */
  export class DefaultImportManager {
    /**
     * Available import stages in order of execution.
     */
    static Stages: readonly string[];

    /**
     * Creates an instance of `DefaultImportManager`.
     *
     * @param provider - The provider used to create the manager map (e.g., 'gmail')
     */
    constructor(provider: string);

    /**
     * Runs a single import stage for the given email.
     *
     * @param target - The import source message containing stage and email data
     * @param options - Options object containing the Next.js request
     * @returns The updated import source message after stage processing
     * @throws {LoggedError} If stage processing fails
     */
    runImportStage(
      target: ImportSourceMessage,
      options: { req: NextRequest },
    ): Promise<ImportSourceMessage>;

    /**
     * Imports the email for the given email ID through all stages.
     *
     * Orchestrates the complete import process from 'new' to 'completed' stage:
     * 1. Fetches raw email data
     * 2. Stages for processing
     * 3. Downloads and processes attachments
     * 4. Extracts contacts
     * 5. Parses headers
     * 6. Parses body content
     * 7. Marks as completed
     *
     * @param emailId - The provider email ID to import
     * @param options - Options object containing the Next.js request
     * @returns Import response indicating success/failure with optional data or error
     */
    importEmail(
      emailId: string,
      options: { req: NextRequest },
    ): Promise<ImportResponse>;
  }
}
