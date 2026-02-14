import { filterRuleFactory, } from './url-filter-rules';
import { LRUCache } from 'lru-cache';
import { log, LoggedError } from '@compliance-theater/logger';
import { hash } from 'node:crypto';
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
];
const UrlRegExp = /((?:https?:\/\/[^\s]+)?\/[^\s]+)/i;
export class UrlFilterEngine {
    #rules;
    #urlKeys;
    #cache;
    #cacheVersion = 0;
    constructor(options = { rules: [] }) {
        this.#rules = options.rules.map(filterRuleFactory);
        this.#urlKeys = options.urlKeys ? [...options.urlKeys] : UrlAttributeKeys;
        this.#cache = new LRUCache({
            max: options.maxCacheSize || 100,
        });
    }
    matches(url) {
        return this.extractUrls(url).some((u) => this.#rules.some((rule) => rule.matches(u)));
    }
    get options() {
        return {
            pattern: 'see rules',
            rules: this.#rules.map((rule) => rule.options),
        };
    }
    extractUrls(input) {
        try {
            return this.#extractUrlsImpl(input);
        }
        catch (err) {
            LoggedError.isTurtlesAllTheWayDownBaby(err, {
                log: true,
                input,
            });
            return [];
        }
    }
    getCacheKey(input) {
        const prefix = `v${this.#cacheVersion}:`;
        if (!input)
            return prefix + 'null';
        if (typeof input === 'string')
            return prefix + input;
        try {
            const json = JSON.stringify(input);
            const key = json.length > 200 ? hash('sha256', json) : json;
            return prefix + key;
        }
        catch {
            return prefix + `__nocache_${Date.now()}_${Math.random()}`;
        }
    }
    #extractUrlsImpl(input, depth = 0) {
        if (depth > 10) {
            log((l) => l.warn('Max recursion depth exceeded'));
            return [];
        }
        const key = this.getCacheKey(input);
        const cached = this.#cache.get(key);
        if (cached)
            return cached;
        let result;
        if (typeof input === 'string') {
            try {
                const match = UrlRegExp.exec(input);
                result = match?.[1] ? [match[1]] : [];
            }
            catch (err) {
                log((l) => l.warn('Regex failed', { error: err }));
                result = [];
            }
        }
        else if (Array.isArray(input)) {
            result = input.flatMap((val) => this.#extractUrlsImpl(val, depth + 1));
        }
        else if (typeof input === 'object' && input !== null) {
            result = Object.keys(input).flatMap((key) => {
                const prop = input[key];
                return this.#urlKeys.includes(key) || typeof prop === 'object'
                    ? this.#extractUrlsImpl(prop, depth + 1)
                    : [];
            });
        }
        else {
            result = [];
        }
        this.#cache.set(key, result);
        return result;
    }
    addRule(rule) {
        const newRule = filterRuleFactory(rule);
        this.#rules.push(newRule);
        this.#cacheVersion++;
        return this;
    }
    removeRule(rule) {
        this.#rules = this.#rules.filter((r) => r !== rule);
        this.#cacheVersion++;
        return this;
    }
    clearRules() {
        this.#rules = [];
        this.#cacheVersion++;
        return this;
    }
    clearCache() {
        this.#cache.clear();
    }
}
//# sourceMappingURL=url-filter-engine.js.map