import { isErrorLike, } from '@/lib/react-util/errors/error-like';
import { normalizeDebounceKey, normalizeErrorMessage } from './utility';
export class LastErrorMap {
    #lastErrorTime;
    #lastErrorKeys;
    constructor() {
        this.#lastErrorTime = new Map();
        this.#lastErrorKeys = new Map();
    }
    lastErrorAt(error, allowLooseMatch = true) {
        const errorKey = LastErrorMap.makeErrorKey(error);
        let ret = this.#lastErrorTime.get(errorKey);
        if (ret === undefined && allowLooseMatch) {
            for (const [key, time] of this.#lastErrorTime.entries()) {
                if (time > (ret ?? 0) && key.includes(errorKey)) {
                    ret = time;
                    continue;
                }
            }
        }
        return ret;
    }
    add(error, now) {
        const errorKey = LastErrorMap.makeErrorKey(error);
        this.#lastErrorTime.set(errorKey, now);
        const messagePart = errorKey.split(LastErrorMap.KeyDelimiter)[0];
        const errorKeys = this.#lastErrorKeys.get(messagePart) || [];
        if (!errorKeys.includes(errorKey)) {
            errorKeys.push(errorKey);
            this.#lastErrorKeys.set(messagePart, errorKeys);
        }
    }
    shouldDebounce(error, debounceMs) {
        const now = Date.now();
        const lastTime = this.lastErrorAt(error);
        this.add(error, now);
        return !!lastTime && now - lastTime < debounceMs;
    }
    static makeErrorKey(error, filename, [line = 0, column = 0] = [0, 0]) {
        let errorMessage;
        let errorSource;
        if (isErrorLike(error)) {
            errorMessage = error.message;
            errorSource = filename ?? error.stack ?? '';
        }
        else {
            errorMessage = error;
            errorSource = filename ?? '';
        }
        const theColumn = column > 0 ? `-${column}` : '';
        const lineAndColumn = line > 0 ? String(line) + theColumn : theColumn;
        return normalizeDebounceKey(normalizeErrorMessage(errorMessage) +
            LastErrorMap.KeyDelimiter +
            errorSource +
            LastErrorMap.KeyDelimiter +
            lineAndColumn);
    }
    static KeyDelimiter = '~~-~~';
}
//# sourceMappingURL=last-error-map.js.map