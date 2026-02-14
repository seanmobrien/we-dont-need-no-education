import type { ErrorLike } from '@/lib/react-util/errors/error-like';
import type { ErrorSuppressionRule, SuppressionResult } from './types';
export declare const shouldSuppressError: ({ error, suppressionRules, }: {
    error: ErrorLike;
    suppressionRules?: ErrorSuppressionRule[];
}) => SuppressionResult;
//# sourceMappingURL=utility.d.ts.map