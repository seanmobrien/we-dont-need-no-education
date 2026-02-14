import { UrlFilterEngine } from './url-filter-engine';
import { log } from '@compliance-theater/logger';
export class UrlFilteredLogExporter extends UrlFilterEngine {
    #inner;
    constructor(inner, opts = { rules: [] }) {
        super(opts);
        this.#inner = inner;
    }
    export(records, resultCallback) {
        try {
            const retained = records.filter((rec) => {
                try {
                    const base = rec;
                    return !(this.matches(base.body) || this.matches(base.attributes));
                }
                catch (err) {
                    log((l) => l.warn('Filter evaluation failed for record', { error: err }));
                    return true;
                }
            });
            if (retained.length < records.length) {
                const dropped = records.length - retained.length;
                log((l) => l.info('Filtered log records', {
                    dropped,
                    retained: retained.length,
                }));
            }
            this.#inner.export(retained, resultCallback);
        }
        catch (err) {
            log((l) => l.error('Log filtering failed, exporting all records', {
                error: err,
                recordCount: records.length,
            }));
            this.#inner.export(records, resultCallback);
        }
    }
    async shutdown() {
        await this.#inner.shutdown?.();
    }
}
export default UrlFilteredLogExporter;
//# sourceMappingURL=url-filtered-log-exporter.js.map