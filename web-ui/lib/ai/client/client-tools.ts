import { ToolCall } from "ai";



export const openCaseFile = ({ caseId, page }: { caseId: string, page?: string }) => {
  const pagePart = page ? `/${page}` : '';
  window.open(`/messages/email/${caseId}${pagePart}`, '_blank');
};


export const onClientToolRequest = async ({
  toolCall,
  addToolResult,
}: {
  toolCall: ToolCall<string, unknown>;
  addToolResult: <TResult>({ toolCallId, result }: { toolCallId: string; result: TResult }) => void;
}) => {
  const { toolName } = toolCall;
  switch (toolName) {
    case 'askConfirmation':
      // Handled by ConfirmationPrompt component
      break;
    case 'openCaseFile':
      // TODO: Validate confirmation hash
      openCaseFile(toolCall.args as { caseId: string; page?: string });
      addToolResult({ toolCallId: toolCall.toolCallId, result: { success: true, notes: 'Opened case file' } });
      break;
    default:
      // Not my tool
      break;
  }
};