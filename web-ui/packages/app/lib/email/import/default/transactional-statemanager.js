import { ImportStageValues, } from '@/data-models/api/import/email-message';
import { query, queryExt } from '@compliance-theater/database/driver';
import { log } from '@compliance-theater/logger';
export class TransactionalStateManagerBase {
    static NullId = 'null-id';
    static calculateNextStage = (stage) => {
        if (stage === 'completed') {
            return 'completed';
        }
        const thisStageIndex = ImportStageValues.indexOf(stage);
        if (thisStageIndex === -1) {
            throw new Error(`Invalid stage: ${stage}`);
        }
        return ImportStageValues[thisStageIndex + 1];
    };
    #transactionId;
    #stage;
    #nextStage;
    #activeTransaction;
    #request;
    #skipStageBump = false;
    importEvent;
    constructor(stage, { req }) {
        this.#stage = stage;
        this.#nextStage =
            stage === 'completed'
                ? stage
                : ImportStageValues[ImportStageValues.indexOf(stage) + 1];
        this.#transactionId = TransactionalStateManagerBase.NullId;
        this.#request = req;
    }
    get request() {
        return this.#request;
    }
    get requireRequest() {
        if (!this.#request) {
            throw new Error('Request is required');
        }
        return this.#request;
    }
    get txId() {
        return this.#transactionId ?? TransactionalStateManagerBase.NullId;
    }
    get stage() {
        return this.#stage;
    }
    get nexStage() {
        return this.#nextStage;
    }
    begin(options) {
        if (this.#activeTransaction) {
            throw new Error('Transaction already in progress');
        }
        if (options.target && typeof options.target === 'object') {
            this.setTransaction(options.target);
        }
        return Promise.resolve(options);
    }
    setTransaction(target, skipStageBump) {
        if (this.#activeTransaction) {
            throw new Error('Transaction already in progress');
        }
        if (!target ||
            typeof target !== 'object' ||
            !target.raw ||
            !target.raw.id) {
            return false;
        }
        this.#transactionId = target.id ?? TransactionalStateManagerBase.NullId;
        this.#activeTransaction = JSON.parse(JSON.stringify(target));
        if (skipStageBump === true) {
            this.#skipStageBump = true;
        }
        log((l) => l.info({
            message: '[AUDIT]: Import Transaction Started.',
            stage: this.stage,
            txId: this.txId,
        }));
        return true;
    }
    async commit(ctx) {
        if (this.importEvent) {
            this.importEvent[Symbol.dispose]?.();
            log((l) => l.info(this.importEvent)).then(() => (this.importEvent = undefined));
        }
        if (!this.#skipStageBump) {
            const work = ctx;
            work.currentStage = ctx.nextStage;
            if (work.target) {
                work.target.stage = work.currentStage;
            }
            if (ctx.currentStage !== 'completed') {
                work.nextStage = TransactionalStateManagerBase.calculateNextStage(ctx.nextStage);
            }
        }
        if (!this.#activeTransaction) {
            return ctx;
        }
        const id = this.txId;
        if (id === TransactionalStateManagerBase.NullId) {
            if (ctx.currentStage !== 'new') {
                log((l) => l.error(new Error('Transaction ID is null')));
            }
        }
        else if (!this.#skipStageBump) {
            if (ctx.currentStage === 'completed') {
                const result = await query((sql) => sql `DELETE FROM staging_message WHERE id = ${id} RETURNING id`);
                if (!result.length) {
                    throw new Error('Failed to delete staging message');
                }
            }
            else {
                const result = await queryExt((sql) => sql `UPDATE staging_message SET stage = ${ctx.currentStage} WHERE id = ${id}`);
                if (!result.rowCount) {
                    throw new Error('Failed to update staging message');
                }
            }
            log((l) => l.info({
                message: '[AUDIT]: Import Transaction Committed.',
                stage: this.#stage,
                txId: this.#activeTransaction?.id,
            }));
        }
        this.#resetTransaction();
        return ctx;
    }
    #resetTransaction() {
        this.#activeTransaction = undefined;
        this.#transactionId = TransactionalStateManagerBase.NullId;
        this.#skipStageBump = false;
    }
    async rollback() {
        if (this.importEvent) {
            this.importEvent[Symbol.dispose]?.();
            log((l) => l.info(this.importEvent)).then(() => (this.importEvent = undefined));
        }
        const id = this.txId;
        if (!id || id === TransactionalStateManagerBase.NullId) {
            log((l) => l.verbose({ message: 'No active transaction to roll back' }));
            this.#resetTransaction();
            return;
        }
        const result = await query((sql) => sql `UPDATE staging_message SET stage = ${this.#stage} WHERE id = ${id} RETURNING id`);
        if (!result.length) {
            throw new Error('Rollback failed: no rows updated');
        }
        log((l) => l.warn({
            message: '[AUDIT]: Import Transaction Rolled Back.',
            stage: this.#stage,
            txId: this.txId,
        }));
        this.#resetTransaction();
    }
    run(ctx) {
        throw new Error('Method not implemented.');
    }
}
//# sourceMappingURL=transactional-statemanager.js.map