import { rateLimitMetrics } from './metrics';
import { log } from '@compliance-theater/logger';
export function recordRequestMetrics(startTime, modelClassification, operationType) {
    const duration = Date.now() - startTime;
    rateLimitMetrics.recordProcessingDuration(duration, modelClassification);
    log((l) => l.info(`${operationType} finished successfully in ${duration}ms for model ${modelClassification}`));
}
export function getCurrentProvider(modelKey) {
    if (modelKey?.includes('google')) {
        return 'google';
    }
    return 'azure';
}
export function constructModelKey(provider, classification) {
    return `${provider}:${classification}`;
}
//# sourceMappingURL=metrics-utils.js.map