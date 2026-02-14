import { DEFAULT_SUPPRESSION_RULES } from './default-suppression-rules';
const normalizeErrorMessage = (message, { maxLength = 2048 } = {}) => {
    return message.replace(/^(?:Uncaught\s+)+/g, '').substring(0, maxLength);
};
export const shouldSuppressError = ({ error, suppressionRules, }) => {
    const testMatch = (pattern, value) => {
        return (!!value &&
            (typeof pattern === 'string'
                ? value.includes(pattern)
                : pattern.test(value)));
    };
    const errorMessage = normalizeErrorMessage(error.message);
    const errorSource = error.source;
    const matchedRule = (suppressionRules ?? DEFAULT_SUPPRESSION_RULES).find((rule) => {
        const messageMatches = testMatch(rule.pattern, errorMessage);
        if (!messageMatches) {
            return false;
        }
        if (rule.source) {
            const sourceMatches = testMatch(rule.source, errorSource || '');
            if (!sourceMatches) {
                return false;
            }
        }
        return true;
    });
    return matchedRule
        ? {
            suppress: true,
            rule: matchedRule,
            completely: matchedRule.suppressCompletely,
        }
        : { suppress: false };
};
//# sourceMappingURL=utility.js.map