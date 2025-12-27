import { AbstractLogger } from './abstract-logger';
export class WrappedLogger extends AbstractLogger {
    #logger;
    constructor(logger) {
        super();
        this.#logger = logger;
    }
    logInfoMessage(record) {
        this.#logger.info(record);
    }
    logErrorMessage(record) {
        this.#logger.error(record);
    }
    logWarnMessage(record) {
        this.#logger.warn(record);
    }
    logDebugMessage(record) {
        this.#logger.debug(record);
    }
    logFatalMessage(record) {
        this.#logger.fatal(record);
    }
    logVerboseMessage(record) {
        this.#logger.verbose(record);
    }
    logSillyMessage(record) {
        this.#logger.silly(record);
    }
    logTraceMessage(record) {
        this.#logger.trace(record);
    }
}
