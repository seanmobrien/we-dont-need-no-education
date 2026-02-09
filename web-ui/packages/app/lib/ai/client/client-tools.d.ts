import { UIDataTypes, UIMessage, UITools } from 'ai';
import { ValueOf } from 'next/dist/shared/lib/constants';
interface ToolCall<NAME extends string, INPUT> {
    toolCallId: string;
    toolName: NAME;
    input: INPUT;
    providerExecuted?: boolean;
    dynamic?: boolean;
}
type InferUIMessageTools<T extends UIMessage> = T extends UIMessage<unknown, UIDataTypes, infer TOOLS> ? TOOLS : UITools;
type InferUIMessageToolCall<UI_MESSAGE extends UIMessage> = ValueOf<{
    [NAME in keyof InferUIMessageTools<UI_MESSAGE>]: ToolCall<NAME & string, InferUIMessageTools<UI_MESSAGE>[NAME] extends {
        input: infer INPUT;
    } ? INPUT : never> & {
        dynamic?: false;
    };
}> | (ToolCall<string, unknown> & {
    dynamic: true;
});
export declare const openCaseFile: ({ caseId, page, }: {
    caseId: string;
    page?: string;
}) => void;
export declare const onClientToolRequest: ({ toolCall, addToolResult, }: {
    toolCall: InferUIMessageToolCall<UIMessage<unknown, UIDataTypes, UITools>>;
    addToolResult: <TResult>(props: {
        tool: string;
        toolCallId: string;
        output: TResult;
    }) => void;
}) => Promise<void>;
export {};
//# sourceMappingURL=client-tools.d.ts.map