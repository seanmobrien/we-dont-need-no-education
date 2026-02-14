import { getCacheConfig } from './config';
const config = getCacheConfig();
export const createStreamFromCachedText = (parsed) => {
    return new ReadableStream({
        start(controller) {
            const text = parsed.content?.reduce((acc, part) => acc + (part.type === 'text' ? part.text : ''), '') || '';
            for (let i = 0; i < text.length; i += config.streamChunkSize) {
                const chunk = text.slice(i, i + config.streamChunkSize);
                controller.enqueue({
                    type: 'text-delta',
                    id: parsed.id,
                    delta: chunk,
                });
            }
            const finishReason = (parsed.finishReason || 'stop');
            if (parsed.usage) {
                controller.enqueue({
                    type: 'finish',
                    finishReason,
                    usage: parsed.usage,
                });
            }
            else {
                controller.enqueue({
                    type: 'finish',
                    finishReason,
                    usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
                });
            }
            controller.close();
        },
    });
};
//# sourceMappingURL=streamUtils.js.map