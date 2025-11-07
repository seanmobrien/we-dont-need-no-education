export interface IFilterRule {
  matches(url: string): boolean;
  get options(): UrlFilterRuleOptions;
}

export type UrlFilterRuleOptions = {
  pattern: RegExp | string;
};

export type FilterOptionsInput =
  | string
  | RegExp
  | UrlFilterRuleOptions
  | IFilterRule;

export type UrlFilterOptions = {
  /** Array of URL filter rules to apply */
  rules: Array<FilterOptionsInput>;
};
export const isUrlFilterOptions = (
  obj: unknown,
): obj is UrlFilterRuleOptions => {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }
  if (!('pattern' in obj) || !obj.pattern) {
    return false;
  }
  return true;
};

export const urlFilterRuleOptionsFactory = (
  rule: Exclude<FilterOptionsInput, IFilterRule>,
) => {
  // Is the value already UrlFilterRuleOptions?
  if (isUrlFilterOptions(rule)) {
    return rule;
  }
  // Is the value already parsed into a regexp?
  if (rule instanceof RegExp) {
    return { pattern: rule };
  }
  // Can we parse it as a regexp?
  if (rule.startsWith('/') && rule.endsWith('/')) {
    try {
      const pattern = new RegExp(rule.slice(1, -1));
      return { pattern };
    } catch {
      // If parsing fails, fall back to a string pattern
      return { pattern: String(rule) };
    }
  }
  // Otherwise treat as a string pattern
  return { pattern: String(rule) };
};

abstract class BaseFilterRule<T extends string | RegExp>
  implements IFilterRule
{
  #pattern: T;

  constructor(pattern: T | null) {
    if (!pattern) {
      throw new TypeError('Filter rule pattern is required');
    }
    this.#pattern = pattern;
  }

  protected get pattern(): T {
    return this.#pattern;
  }
  protected set pattern(value: T) {
    this.#pattern = value;
  }
  get options(): UrlFilterRuleOptions {
    return { pattern: this.pattern };
  }

  abstract matches(url: string): boolean;
}

class RegExpFilterRule extends BaseFilterRule<RegExp> {
  constructor(pattern: RegExp) {
    super(pattern);
  }
  matches(url: string): boolean {
    return this.pattern.test(url);
  }
}

class StringFilterRule extends BaseFilterRule<string> {
  constructor(pattern: string) {
    super(pattern?.toLocaleLowerCase());
  }

  matches(url: string): boolean {
    const check = url.toLocaleLowerCase();
    return check.includes(this.pattern);
  }
}

const isFilterRule = (obj: unknown): obj is IFilterRule => {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }
  if (!('options' in obj)) {
    return false;
  }
  const checkOps = obj.options;
  if (
    typeof checkOps !== 'object' ||
    checkOps === null ||
    !('pattern' in checkOps) ||
    !checkOps.pattern
  ) {
    return false;
  }
  if (!('matches' in obj) || typeof obj.matches !== 'function') {
    return false;
  }
  return true;
};

export const filterRuleFactory = (opts: FilterOptionsInput): IFilterRule => {
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
