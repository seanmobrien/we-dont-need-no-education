export const openCaseFile = ({ caseId, page, }) => {
    const pagePart = page ? `/${page}` : '';
    window.open(`/messages/email/${caseId}${pagePart}`, '_blank');
};
export const onClientToolRequest = async ({ toolCall, addToolResult, }) => {
    const { toolName } = toolCall;
    switch (toolName) {
        case 'askConfirmation':
            break;
        case 'openCaseFile':
            openCaseFile(toolCall.input);
            addToolResult({
                tool: toolName,
                toolCallId: toolCall.toolCallId,
                output: { success: true, notes: 'Opened case file' },
            });
            break;
        default:
            break;
    }
};
//# sourceMappingURL=client-tools.js.map