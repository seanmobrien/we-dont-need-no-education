import {
  isErrorLike,
  StringOrErrorLike,
} from '@/lib/react-util/errors/error-like';
import { normalizeDebounceKey, normalizeErrorMessage } from './utility';

export class LastErrorMap {
  #lastErrorTime: Map<string, number>;
  #lastErrorKeys: Map<string, Array<string>>;

  constructor() {
    this.#lastErrorTime = new Map();
    this.#lastErrorKeys = new Map();
  }
  lastErrorAt(
    error: StringOrErrorLike,
    allowLooseMatch = true,
  ): number | undefined {
    const errorKey = LastErrorMap.makeErrorKey(error);
    let ret = this.#lastErrorTime.get(errorKey);
    if (ret === undefined && allowLooseMatch) {
      // Try to find a loose match if exact key not found
      for (const [key, time] of this.#lastErrorTime.entries()) {
        if (time > (ret ?? 0) && key.includes(errorKey)) {
          ret = time;
          continue;
        }
      }
    }
    return ret;
  }

  add(error: StringOrErrorLike, now: number): void {
    const errorKey = LastErrorMap.makeErrorKey(error);
    this.#lastErrorTime.set(errorKey, now);
    const messagePart = errorKey.split(LastErrorMap.KeyDelimiter)[0];
    const errorKeys = this.#lastErrorKeys.get(messagePart) || [];
    if (!errorKeys.includes(errorKey)) {
      errorKeys.push(errorKey);
      this.#lastErrorKeys.set(messagePart, errorKeys);
    }
  }
  /**
   * Check if this error should be debounced (duplicate within time window)
   */
  shouldDebounce(error: StringOrErrorLike, debounceMs: number): boolean {
    const now = Date.now();
    const lastTime = this.lastErrorAt(error);
    this.add(error, now);
    return !!lastTime && now - lastTime < debounceMs;
  }

  static makeErrorKey(
    error: StringOrErrorLike,
    filename?: string,
    [line = 0, column = 0]: [number, number] = [0, 0],
  ): string {
    let errorMessage: string;
    let errorSource: string;
    if (isErrorLike(error)) {
      // TODO: if line/column is empty we could theoretically try to pull it out of the stack
      errorMessage = error.message;
      errorSource = filename ?? error.stack ?? '';
    } else {
      errorMessage = error;
      errorSource = filename ?? '';
    }
    const theColumn = column > 0 ? `-${column}` : '';
    const lineAndColumn = line > 0 ? String(line) + theColumn : theColumn;
    return normalizeDebounceKey(
      normalizeErrorMessage(errorMessage) +
        LastErrorMap.KeyDelimiter +
        errorSource +
        LastErrorMap.KeyDelimiter +
        lineAndColumn,
    );
  }

  static readonly KeyDelimiter = '~~-~~';
}
