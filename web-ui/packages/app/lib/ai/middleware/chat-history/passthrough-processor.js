import { StreamProcessor } from './stream-processor';
import { ensureCreateResult } from './stream-handler-result';
export class PassthroughStreamProcessor extends StreamProcessor {
    async processToolCall(chunk, context) {
        ensureCreateResult(context);
        context.generatedJSON.push(chunk);
        return context.createResult(true);
    }
    async processToolResult(chunk, context) {
        ensureCreateResult(context);
        context.generatedJSON.push(chunk);
        return context.createResult({
            generatedText: context.generatedText + JSON.stringify(chunk.output)
        });
    }
    async processFinish(chunk, context) {
        ensureCreateResult(context);
        context.generatedJSON.push(chunk);
        return context.createResult({ currentMessageId: undefined });
    }
    async processError(chunk, context) {
        context.generatedText =
            context.generatedText +
                JSON.stringify(chunk);
        context.generatedJSON.push(chunk);
        return context.createResult({ generatedText: context.generatedText });
    }
    async processMetadata(chunk, context) {
        context.generatedJSON.push(chunk);
        return context.createResult(true);
    }
    async processOther(chunk, context) {
        context.generatedText =
            context.generatedText +
                JSON.stringify(chunk);
        return context.createResult({ generatedText: context.generatedText });
    }
}
//# sourceMappingURL=passthrough-processor.js.map