import type {
  LanguageModelV2Middleware,
  LanguageModelV2StreamPart,
} from '@ai-sdk/provider';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { memoryClientFactory } from '../mem0';
import { log } from '@/lib/logger';
import { MiddlewareStateManager } from './state-management';
import { LoggedError } from '@/lib/react-util/errors/logged-error';

const originalMemoryMiddleware: LanguageModelV2Middleware = {
  wrapStream: async ({ doStream }) => {
    try {
      log(l => l.verbose('=== Memory middleware stream start ==='));
      const { stream, ...rest } = await doStream();
      const transformStream = new TransformStream<
        LanguageModelV2StreamPart,
        LanguageModelV2StreamPart
      >({
        transform(chunk, controller) {
          controller.enqueue(chunk);
        },
        flush() {
          log(l => l.verbose('Memory middleware stream flushed'));
        },
      });

      return {
        stream: stream.pipeThrough(transformStream),
        ...rest,
      };
    } catch (error) {
      throw LoggedError.isTurtlesAllTheWayDownBaby(error, {
        source: 'memoryMiddleware',
        log: true,
      })
    } finally {
      log(l => l.verbose('=== Memory middleware stream end ==='));
    }
  },

  transformParams: async ({ params }) => {
    /*    
    // Create a memory client instance with the necessary configuration
    const memoryClient = await memoryClientFactory({
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

export const memoryMiddleware =
  MiddlewareStateManager.Instance.basicMiddlewareWrapper({
    middlewareId: 'memory-middleware',
    middleware: originalMemoryMiddleware,
  });

export default memoryMiddleware;
