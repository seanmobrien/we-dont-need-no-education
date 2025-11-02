export const panelStableStyles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: 2,
    width: 1,
    height: '-webkit-fill-available',
    boxSizing: 'border-box',
  } as const,
  chatInput: {
    marginBottom: 2,
    flexShrink: 0,
    width: '100%',
  } as const,
  stack: {
    flexGrow: 1,
    overflow: 'hidden',
    width: 1,
    minHeight: 0, // Allow flex shrinking
    maxHeight: 1,
    paddingTop: 0,
    marginTop: 0,
  } as const,
  chatBox: {
    flex: 1,
    minHeight: 0,
    overflow: 'hidden',
  } as const,
  placeholderBox: {
    padding: 2,
    textAlign: 'center',
    color: 'text.secondary',
  } as const,
  inputAdornmentBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  } as const,
  statusIconsBox: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 1,
    width: '100%',
    marginTop: -1,
    marginBottom: 1,
  } as const,
} as const;
