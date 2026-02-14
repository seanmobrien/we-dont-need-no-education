export const ensureCreateResult = (context) => {
    const thisContext = typeof context === 'boolean' ? { success: context } : context ?? {};
    const thisCreateResult = ((successOrPatch) => {
        return {
            success: true,
            ...thisContext,
            ...(typeof successOrPatch === 'boolean' ? { success: successOrPatch } : successOrPatch ?? {})
        };
    });
    return {
        createResult: thisCreateResult,
        ...thisCreateResult(context),
    };
};
//# sourceMappingURL=stream-handler-result.js.map