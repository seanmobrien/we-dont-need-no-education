import { instrumentStreamChunk } from './instrumentation';
import { ensureCreateResult } from './stream-handler-result';
const OPEN_TEXT_SYM = Symbol.for('chat-history.openTextBuffers');
const OPEN_REASONING_SYM = Symbol.for('chat-history.openReasoningBuffers');
const OPEN_TOOL_INPUT_SYM = Symbol.for('chat-history.openToolInputBuffers');
function getOpenText(context) {
    const bag = context;
    if (!bag[OPEN_TEXT_SYM]) {
        bag[OPEN_TEXT_SYM] = new Map();
    }
    return bag[OPEN_TEXT_SYM];
}
function getOpenReasoning(context) {
    const bag = context;
    if (!bag[OPEN_REASONING_SYM]) {
        bag[OPEN_REASONING_SYM] = new Map();
    }
    return bag[OPEN_REASONING_SYM];
}
function getOpenToolInput(context) {
    const bag = context;
    if (!bag[OPEN_TOOL_INPUT_SYM]) {
        bag[OPEN_TOOL_INPUT_SYM] = new Map();
    }
    return bag[OPEN_TOOL_INPUT_SYM];
}
export class StreamProcessor {
    async process(chunk, context) {
        ensureCreateResult(context);
        return await instrumentStreamChunk(chunk.type, context, async () => {
            switch (chunk.type) {
                case 'text-start': {
                    const { id } = chunk;
                    getOpenText(context).set(id, '');
                    return context.createResult(true);
                }
                case 'text-delta': {
                    const { id, delta } = chunk;
                    const map = getOpenText(context);
                    if (!map.has(id))
                        map.set(id, '');
                    map.set(id, (map.get(id) || '') + delta);
                    context.generatedText = (context.generatedText || '') + delta;
                    return context.createResult({
                        generatedText: context.generatedText,
                    });
                }
                case 'text-end': {
                    const { id } = chunk;
                    const map = getOpenText(context);
                    const text = map.get(id) || '';
                    map.delete(id);
                    if (text)
                        context.generatedJSON.push({ type: 'text', text });
                    return context.createResult(true);
                }
                case 'reasoning-start': {
                    const { id } = chunk;
                    getOpenReasoning(context).set(id, '');
                    return context.createResult(true);
                }
                case 'reasoning-delta': {
                    const { id, delta } = chunk;
                    const map = getOpenReasoning(context);
                    if (!map.has(id))
                        map.set(id, '');
                    map.set(id, (map.get(id) || '') + delta);
                    return context.createResult(true);
                }
                case 'reasoning-end': {
                    const { id } = chunk;
                    const map = getOpenReasoning(context);
                    const text = map.get(id) || '';
                    map.delete(id);
                    if (text)
                        context.generatedJSON.push({ type: 'reasoning', text });
                    return context.createResult(true);
                }
                case 'tool-input-start': {
                    const { id, toolName } = chunk;
                    getOpenToolInput(context).set(id, { toolName, value: '' });
                    return context.createResult(true);
                }
                case 'tool-input-delta': {
                    const { id, delta } = chunk;
                    const map = getOpenToolInput(context);
                    const buf = map.get(id) || { value: '' };
                    buf.value = (buf.value || '') + delta;
                    map.set(id, buf);
                    return context.createResult(true);
                }
                case 'tool-input-end': {
                    const { id } = chunk;
                    const map = getOpenToolInput(context);
                    const buf = map.get(id);
                    if (buf) {
                        const t = (buf.value ?? '').trim();
                        if (t.length > 0) {
                            let input = buf.value;
                            if ((t.startsWith('{') && t.endsWith('}')) ||
                                (t.startsWith('[') && t.endsWith(']'))) {
                                try {
                                    input = JSON.parse(buf.value);
                                }
                                catch {
                                }
                            }
                            context.generatedJSON.push({
                                type: 'tool-input',
                                id,
                                ...(buf.toolName ? { toolName: buf.toolName } : {}),
                                input,
                            });
                        }
                        map.delete(id);
                    }
                    return context.createResult(true);
                }
                case 'tool-call':
                    return await this.processToolCall(chunk, context);
                case 'tool-result':
                    if ('output' in chunk) {
                        return await this.processToolResult(chunk, context);
                    }
                    return await this.processToolResult({
                        ...chunk,
                        output: {
                            type: 'content',
                            value: []
                        }
                    }, context);
                case 'finish':
                    return await this.processFinish(chunk, context);
                case 'error':
                    return await this.processError(chunk, context);
                case 'file':
                case 'source':
                case 'raw':
                case 'response-metadata':
                case 'stream-start':
                    return await this.processMetadata(chunk, context);
                default:
                    return await this.processOther(chunk, context);
            }
        });
    }
}
//# sourceMappingURL=stream-processor.js.map