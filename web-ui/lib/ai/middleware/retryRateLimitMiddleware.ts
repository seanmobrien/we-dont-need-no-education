import type { LanguageModelV1Middleware, LanguageModelV1StreamPart } from 'ai';

export const retryRateLimitMiddleware: LanguageModelV1Middleware = {
  wrapGenerate: async ({ doGenerate }) => {

    const result = await doGenerate();

    return result;
  },

  wrapStream: async ({ doStream }) => {
    // Here you can override the stream function to add custom behavior
    // For example, you could log the stream parts, modify them before returning,
    // or return a cached stream.

    const { stream, ...rest } = await doStream();

    // let generatedText = '';

    const transformStream = new TransformStream<
      LanguageModelV1StreamPart,
      LanguageModelV1StreamPart
    >({
      transform(chunk, controller) {
        if (chunk.type === 'text-delta') {
          // generatedText += chunk.textDelta;
        }

        controller.enqueue(chunk);
      },

      flush() {
       
      },
    });

    return {
      stream: stream.pipeThrough(transformStream),
      ...rest,
    };
  },

  transformParams: async ({ params }) => {
    
    // Here you can modify the params if needed
    // For example, you could add a custom header or modify the model parameters

    return params;
  },
};
