import { isProgressEvent } from './utilities/error-guards';
export class ProgressEventError {
    name;
    message;
    lengthComputable;
    loaded;
    total;
    cause;
    #source;
    #headers;
    constructor(event) {
        if (!event || !isProgressEvent(event)) {
            throw new TypeError('ProgressEventError requires a ProgressEvent as its source.');
        }
        this.name = 'ProgressEventError';
        this.message = 'An API request progress event error has occurred.';
        this.lengthComputable = event.lengthComputable;
        this.loaded = event.loaded;
        this.total = event.total;
        this.#source = event;
        this.cause = { source: event.target };
    }
    get source() {
        return this.#source;
    }
    get headers() {
        if (this.#headers) {
            return this.#headers;
        }
        if (!this.#source ||
            !this.#source.target ||
            !(this.#source.target instanceof XMLHttpRequest)) {
            return undefined;
        }
        const xhr = this.#source.target;
        if ('_ajaxData' in xhr &&
            typeof xhr._ajaxData === 'object' &&
            xhr._ajaxData &&
            'xh' in xhr._ajaxData &&
            Array.isArray(xhr._ajaxData.xh)) {
            this.#headers = xhr._ajaxData.xh.reduce((acc, { n: key, v: value }) => {
                acc[key] = value;
                return acc;
            }, {});
        }
        return this.#headers;
    }
    async enrichContext(context) {
        const enriched = {
            ...context,
            timestamp: context.timestamp ?? new Date(),
        };
        try {
            const hdrs = this.headers;
            if (hdrs) {
                enriched.additionalData = {
                    ...(enriched.additionalData ?? {}),
                    xhrHeaders: hdrs,
                };
            }
            if (this.cause && this.cause.source) {
                const src = this.cause.source;
                if (!enriched.url && src && typeof src.responseURL === 'string') {
                    enriched.url = src.responseURL;
                }
            }
        }
        catch {
        }
        return enriched;
    }
}
