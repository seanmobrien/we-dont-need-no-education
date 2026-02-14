export const isUrlFilterOptions = (obj) => {
    if (typeof obj !== 'object' || obj === null) {
        return false;
    }
    if (!('pattern' in obj) || !obj.pattern) {
        return false;
    }
    return true;
};
export const urlFilterRuleOptionsFactory = (rule) => {
    if (isUrlFilterOptions(rule)) {
        return rule;
    }
    if (rule instanceof RegExp) {
        return { pattern: rule };
    }
    if (rule.startsWith('/') && rule.endsWith('/')) {
        try {
            const pattern = new RegExp(rule.slice(1, -1));
            return { pattern };
        }
        catch {
            return { pattern: String(rule) };
        }
    }
    return { pattern: String(rule) };
};
class BaseFilterRule {
    #pattern;
    constructor(pattern) {
        if (!pattern) {
            throw new TypeError('Filter rule pattern is required');
        }
        this.#pattern = pattern;
    }
    get pattern() {
        return this.#pattern;
    }
    set pattern(value) {
        this.#pattern = value;
    }
    get options() {
        return { pattern: this.pattern };
    }
}
class RegExpFilterRule extends BaseFilterRule {
    constructor(pattern) {
        super(pattern);
    }
    matches(url) {
        return this.pattern.test(url);
    }
}
class StringFilterRule extends BaseFilterRule {
    constructor(pattern) {
        super(pattern?.toLocaleLowerCase());
    }
    matches(url) {
        const check = url.toLocaleLowerCase();
        return check.includes(this.pattern);
    }
}
const isFilterRule = (obj) => {
    if (typeof obj !== 'object' || obj === null) {
        return false;
    }
    if (!('options' in obj)) {
        return false;
    }
    const checkOps = obj.options;
    if (typeof checkOps !== 'object' ||
        checkOps === null ||
        !('pattern' in checkOps) ||
        !checkOps.pattern) {
        return false;
    }
    if (!('matches' in obj) || typeof obj.matches !== 'function') {
        return false;
    }
    return true;
};
export const filterRuleFactory = (opts) => {
    if (isFilterRule(opts)) {
        return opts;
    }
    const options = urlFilterRuleOptionsFactory(opts);
    if (!options || !options.pattern) {
        throw new TypeError('UrlFilterRuleOptions.pattern is required');
    }
    if (options.pattern instanceof RegExp) {
        return new RegExpFilterRule(options.pattern);
    }
    if (typeof options.pattern === 'string') {
        return new StringFilterRule(options.pattern);
    }
    return new StringFilterRule(String(options));
};
//# sourceMappingURL=url-filter-rules.js.map