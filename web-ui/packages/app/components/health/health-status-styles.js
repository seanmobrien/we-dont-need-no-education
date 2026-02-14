function createBoxSx(status, size) {
    const sizeProps = size === 'small'
        ? { minWidth: 24, minHeight: 24 }
        : { minWidth: 32, minHeight: 32 };
    const colorProp = status === 'default'
        ? (theme) => theme.palette.text.primary
        : (theme) => theme.palette[status].main;
    return {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        ...sizeProps,
        borderRadius: 1,
        cursor: 'pointer',
        color: colorProp,
        '&:hover': {
            backgroundColor: 'action.hover',
        },
    };
}
export const BOX_SX_VARIANTS = {
    'success-small': createBoxSx('success', 'small'),
    'success-medium': createBoxSx('success', 'medium'),
    'warning-small': createBoxSx('warning', 'small'),
    'warning-medium': createBoxSx('warning', 'medium'),
    'error-small': createBoxSx('error', 'small'),
    'error-medium': createBoxSx('error', 'medium'),
    'default-small': createBoxSx('default', 'small'),
    'default-medium': createBoxSx('default', 'medium'),
};
//# sourceMappingURL=health-status-styles.js.map