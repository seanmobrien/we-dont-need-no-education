import { APICallError } from 'ai';
import { isError } from '@compliance-theater/logger';
export const getRetryErrorInfo = (error) => {
    if (isError(error)) {
        if (APICallError.isInstance(error)) {
            if (error.statusCode === 429) {
                if (error.responseHeaders) {
                    const retryAfterHeader = parseInt(error.responseHeaders['retry-after'] ?? '60');
                    const retryAfter = isNaN(retryAfterHeader) ? 60 : retryAfterHeader;
                    return {
                        isError: true,
                        isRetry: true,
                        error,
                        retryAfter,
                    };
                }
            }
        }
        if (error.cause) {
            const cause = getRetryErrorInfo(error.cause);
            if (cause?.isRetry) {
                return cause;
            }
        }
        if ('lastError' in error) {
            const lastError = getRetryErrorInfo(error.lastError);
            if (lastError?.isRetry) {
                return lastError;
            }
        }
        if ('error' in error) {
            const errorInfo = getRetryErrorInfo(error.error);
            if (errorInfo?.isRetry) {
                return errorInfo;
            }
        }
        return {
            isError: true,
            isRetry: false,
            error,
        };
    }
    if (error && typeof error === 'object' && 'error' in error) {
        const errorInfo = getRetryErrorInfo(error.error);
        if (errorInfo?.isError || errorInfo?.isRetry) {
            return errorInfo;
        }
    }
    return {
        isError: false,
    };
};
//# sourceMappingURL=error-helpers.js.map