import { AbstractLogger } from './abstract-logger';
import type { ILogger } from './types';

export class WrappedLogger extends AbstractLogger {
  readonly #logger: ILogger;

  /**
   *
   */
  constructor(logger: ILogger) {
    super();
    this.#logger = logger;
  }

  protected logInfoMessage(record: object): void {
    this.#logger.info(record);
  }
  protected logErrorMessage(record: object): void {
    this.#logger.error(record);
  }
  protected logWarnMessage(record: object): void {
    this.#logger.warn(record);
  }
  protected logDebugMessage(record: object): void {
    this.#logger.debug(record);
  }
  protected logFatalMessage(record: object): void {
    this.#logger.fatal(record);
  }
  protected logVerboseMessage(record: object): void {
    this.#logger.verbose(record);
  }
  protected logSillyMessage(record: object): void {
    this.#logger.silly(record);
  }
  protected logTraceMessage(record: object): void {
    this.#logger.trace(record);
  }
}
