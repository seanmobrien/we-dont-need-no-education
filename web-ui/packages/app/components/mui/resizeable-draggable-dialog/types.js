export const isValidSize = (size) => {
    return (typeof size === 'object' &&
        size !== null &&
        'height' in size &&
        'width' in size &&
        typeof size.height === 'number' &&
        typeof size.width === 'number' &&
        size.height > 0 &&
        size.width > 0);
};
//# sourceMappingURL=types.js.map