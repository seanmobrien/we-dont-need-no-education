import { AnyValue, AnyValueMap } from '@opentelemetry/api-logs';
import {
  FilterOptionsInput,
  filterRuleFactory,
  IFilterRule,
  UrlFilterOptions,
} from './url-filter-rules';
import { LRUCache } from 'lru-cache';
import { log } from '@compliance-theater/lib-logger';
import { hash } from 'node:crypto'; // or use a fast-hash library
import { LoggedError } from '@/lib/react-util';

/**
 * Keys commonly used to represent URLs in log attributes
 */
const UrlAttributeKeys = [
  'http.url',
  'url',
  'request.url',
  'request_uri',
  'endpoint',
  'uri',
  'path',
  'resource.url',
  'name',
] as const;

const UrlRegExp = /((?:https?:\/\/[^\s]+)?\/[^\s]+)/i;

export abstract class UrlFilterEngine implements IFilterRule {
  #rules: Array<IFilterRule>;
  #urlKeys: readonly string[];
  #cache: LRUCache<string, string[]>;
  #cacheVersion: number = 0; // Add version tracking

  constructor(
    options: UrlFilterOptions & {
      urlKeys?: string[];
      maxCacheSize?: number;
    } = { rules: [] },
  ) {
    this.#rules = options.rules.map(filterRuleFactory);
    this.#urlKeys = options.urlKeys ? [...options.urlKeys] : UrlAttributeKeys;
    this.#cache = new LRUCache<string, string[]>({
      max: options.maxCacheSize || 100,
    });
  }

  matches(url: AnyValue): boolean {
    return this.extractUrls(url).some((u) =>
      this.#rules.some((rule) => rule.matches(u)),
    );
  }

  get options() {
    return {
      pattern: 'see rules',
      rules: this.#rules.map((rule) => rule.options),
    };
  }

  /**
   * Extract all URLs from the input value, including nested structures.
   * Results are cached for identical inputs.
   * @param input - Value to extract URLs from (string, array, or object)
   * @returns Array of extracted URL strings
   */
  extractUrls(input: AnyValue): Array<string> {
    try {
      return this.#extractUrlsImpl(input);
    } catch (err) {
      LoggedError.isTurtlesAllTheWayDownBaby(err, {
        log: true,
        input,
      });
      return []; // Graceful degradation at public API boundary
    }
  }

  private getCacheKey(input: AnyValue): string {
    const prefix = `v${this.#cacheVersion}:`; // ✅ Include version
    if (!input) return prefix + 'null';
    if (typeof input === 'string') return prefix + input;
    try {
      const json = JSON.stringify(input);
      const key = json.length > 200 ? hash('sha256', json) : json;
      return prefix + key; // ✅ Prepend version to all keys
    } catch {
      return prefix + `__nocache_${Date.now()}_${Math.random()}`;
    }
  }

  #extractUrlsImpl(input: AnyValue, depth: number = 0): Array<string> {
    if (depth > 10) {
      log((l) => l.warn('Max recursion depth exceeded'));
      return [];
    }

    // Centralize cache check at top
    const key = this.getCacheKey(input);
    const cached = this.#cache.get(key);
    if (cached) return cached;

    let result: string[];

    // Extract without caching inline
    if (typeof input === 'string') {
      try {
        const match = UrlRegExp.exec(input);
        result = match?.[1] ? [match[1]] : [];
      } catch (err) {
        log((l) => l.warn('Regex failed', { error: err }));
        result = [];
      }
    } else if (Array.isArray(input)) {
      result = input.flatMap((val) => this.#extractUrlsImpl(val, depth + 1));
    } else if (typeof input === 'object' && input !== null) {
      result = Object.keys(input).flatMap((key) => {
        const prop = (input as AnyValueMap)[key];
        return this.#urlKeys.includes(key) || typeof prop === 'object'
          ? this.#extractUrlsImpl(prop, depth + 1)
          : [];
      });
    } else {
      result = [];
    }

    // Centralized cache set
    this.#cache.set(key, result);
    return result;
  }

  addRule(rule: FilterOptionsInput) {
    const newRule = filterRuleFactory(rule);
    this.#rules.push(newRule);
    this.#cacheVersion++; // Increment instead of clearing
    return this;
  }
  removeRule(rule: IFilterRule) {
    this.#rules = this.#rules.filter((r) => r !== rule);
    this.#cacheVersion++; // ⚠️ Critical: invalidate stale cached results
    return this;
  }
  clearRules() {
    this.#rules = [];
    this.#cacheVersion++; // ⚠️ Critical: invalidate stale cached results
    return this;
  }

  // Add public method for testing/maintenance
  clearCache(): void {
    this.#cache.clear();
  }
}
