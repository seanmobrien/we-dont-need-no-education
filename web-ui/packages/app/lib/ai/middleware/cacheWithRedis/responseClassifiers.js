export const isSuccessfulResponse = (response) => {
    return !!(response &&
        response.finishReason !== 'error' &&
        !!response.content &&
        Array.isArray(response.content) &&
        response.content.some((x) => x.type === 'text' && !!x.text) &&
        response.finishReason !== 'other' &&
        response.finishReason !== 'content-filter' &&
        (!response.warnings || response.warnings.length === 0));
};
export const isProblematicResponse = (response) => {
    return !!(response &&
        !!response.content &&
        Array.isArray(response.content) &&
        response.content.length > 0 &&
        response.finishReason !== 'error' &&
        (response.finishReason === 'other' ||
            response.finishReason === 'content-filter' ||
            (response.warnings && response.warnings.length > 0)));
};
//# sourceMappingURL=responseClassifiers.js.map