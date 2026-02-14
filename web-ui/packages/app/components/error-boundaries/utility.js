export const normalizeErrorMessage = (message) => {
    return message.replace(/^(?:Uncaught\s+)+/g, '');
};
export const normalizeDebounceKey = (key) => {
    return normalizeErrorMessage(key).toLowerCase().trim();
};
//# sourceMappingURL=utility.js.map