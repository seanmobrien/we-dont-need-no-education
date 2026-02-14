export const panelStableStyles = {
    container: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: 2,
        width: 1,
        height: ['100%', '-moz-available', '-webkit-fill-available'],
        boxSizing: 'border-box',
    },
    chatInput: {
        marginBottom: 2,
        flexShrink: 0,
        width: '100%',
    },
    stack: {
        flexGrow: 1,
        overflow: 'hidden',
        width: 1,
        minHeight: 0,
        maxHeight: 1,
        paddingTop: 0,
        marginTop: 0,
    },
    chatBox: {
        flex: 1,
        minHeight: 0,
        overflow: 'hidden',
    },
    placeholderBox: {
        padding: 2,
        textAlign: 'center',
        color: 'text.secondary',
    },
    inputAdornmentBox: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
    },
    statusIconsBox: {
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: 1,
        width: '100%',
        marginTop: -1,
        marginBottom: 1,
    },
};
//# sourceMappingURL=styles.js.map