import type { LanguageModelV1Middleware, LanguageModelV1StreamPart } from 'ai';
import { memoryClientFactory } from '../mem0';

export const memoryMiddleware: LanguageModelV1Middleware = {
  wrapStream: async ({ doStream, params }) => {
    console.log('doStream called');
    console.log(`params: ${JSON.stringify(params, null, 2)}`);

    const { stream, ...rest } = await doStream();

    let generatedText = '';

    const transformStream = new TransformStream<
      LanguageModelV1StreamPart,
      LanguageModelV1StreamPart
    >({
      transform(chunk, controller) {
        if (chunk.type === 'text-delta') {
          generatedText += chunk.textDelta;
        }

        controller.enqueue(chunk);
      },

      flush() {
        console.log('doStream finished');
        console.log(`generated text: ${generatedText}`);
      },
    });

    return {
      stream: stream.pipeThrough(transformStream),
      ...rest,
    };
  },

  transformParams: async ({ params }) => {
    /*    
    console.log('transformParams called');
    console.log(`params: ${JSON.stringify(params, null, 2)}`);
    // Create a memory client instance with the necessary configuration
    const memoryClient = memoryClientFactory({
      // TODO: infer userid and projectid from params
    });
    const memories = memoryClient.search(params.query, {
      limit: 10,
      enable_graph: true,
    });
    */
    params.prompt = [
      {
        role: 'system',
        content:
          'You are a helpful assistant equipped with an advanced memory module that enables you to remember past interactions.' +
          ' Your memory is designed to assist you in providing more relevant and personalized responses based on previous conversations.' +
          ' Before generating a response, you will search your memory for relevant past interactions.' +
          ' If you find relevant memories, you will incorporate them into your response.' +
          ' If no relevant memories are found, you will respond based solely on the current prompt.' +
          ' After generating a response, you will update your memory with the new interaction.',
      },
      ...(params.prompt || []),
    ];

    return params;
  },
};
