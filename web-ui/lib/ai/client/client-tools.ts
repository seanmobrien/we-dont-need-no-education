import { UIDataTypes, UIMessage, UITools } from 'ai';
import { ValueOf } from 'next/dist/shared/lib/constants';

/**
Typed tool call that is returned by generateText and streamText.
It contains the tool call ID, the tool name, and the tool arguments.
 */
interface ToolCall<NAME extends string, INPUT> {
  /**
  ID of the tool call. This ID is used to match the tool call with the tool result.
   */
  toolCallId: string;
  /**
  Name of the tool that is being called.
   */
  toolName: NAME;
  /**
  Arguments of the tool call. This is a JSON-serializable object that matches the tool's input schema.
     */
  input: INPUT;
  /**
   * Whether the tool call will be executed by the provider.
   * If this flag is not set or is false, the tool call will be executed by the client.
   */
  providerExecuted?: boolean;
  /**
   * Whether the tool is dynamic.
   */
  dynamic?: boolean;
}
type InferUIMessageTools<T extends UIMessage> =
  T extends UIMessage<unknown, UIDataTypes, infer TOOLS> ? TOOLS : UITools;
type InferUIMessageToolCall<UI_MESSAGE extends UIMessage> =
  | ValueOf<{
      [NAME in keyof InferUIMessageTools<UI_MESSAGE>]: ToolCall<
        NAME & string,
        InferUIMessageTools<UI_MESSAGE>[NAME] extends {
          input: infer INPUT;
        }
          ? INPUT
          : never
      > & {
        dynamic?: false;
      };
    }>
  | (ToolCall<string, unknown> & {
      dynamic: true;
    });

export const openCaseFile = ({
  caseId,
  page,
}: {
  caseId: string;
  page?: string;
}) => {
  const pagePart = page ? `/${page}` : '';
  window.open(`/messages/email/${caseId}${pagePart}`, '_blank');
};

export const onClientToolRequest = async ({
  toolCall,
  addToolResult,
}: {
  toolCall: InferUIMessageToolCall<UIMessage<unknown, UIDataTypes, UITools>>;
  addToolResult: <TResult>(props: {
    tool: string;
    toolCallId: string;
    output: TResult;
  }) => void;
}) => {
  const { toolName } = toolCall;
  switch (toolName) {
    case 'askConfirmation':
      // Handled by ConfirmationPrompt component
      break;
    case 'openCaseFile':
      // TODO: Validate confirmation hash
      openCaseFile(toolCall.input as { caseId: string; page?: string });
      addToolResult({
        tool: toolName,
        toolCallId: toolCall.toolCallId,
        output: { success: true, notes: 'Opened case file' },
      });
      break;
    default:
      // Not my tool
      break;
  }
};
