import type {
  JSONValue,
  LanguageModelV2Middleware,
  LanguageModelV2StreamPart,
  SharedV2ProviderMetadata,
} from '@ai-sdk/provider';
import { MiddlewareStateManager } from './state-management';
import { LanguageModelMiddleware } from 'ai';
import { PickField } from '@/lib/typescript';

const DEFAULT_TELEMETRY = {
  isEnabled: true,
  functionId: 'generic-chat-request',
  metadata: {},
} as const;

const jsonExpression = () =>
  /\`\`\`json[\s\n\r]*((?:\[[\s\n\r]*)?{[\s\S]*?}(?:[\s\n\r]*\])?)[\s\n\r]*\`\`\`/;

function isJsonCodeBlock(text: string): boolean {
  return jsonExpression().test(text);
}

function isValidJsonObject(text: string): boolean {
  const trimmed = text.trim();
  if (
    (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
    (trimmed.startsWith('[') && trimmed.endsWith(']'))
  ) {
    try {
      const parsed = JSON.parse(trimmed);
      return parsed !== null && typeof parsed === 'object';
    } catch {
      return false;
    }
  }
  return false;
}

export const extractJsonFromCodeBlock = (text: string): string => {
  const match = jsonExpression().exec(text);
  if (!match) {
    throw new Error('No valid JSON code block found');
  }
  return match[1];
};

function isStructuredOutputEmpty(result: Record<string, unknown>): boolean {
  if (!result.providerMetadata) {
    return true;
  }

  const metadata = result.providerMetadata as Record<string, unknown>;
  const structured = metadata.structuredOutputs;

  // Check if it's empty object, null, undefined, or empty string
  if (
    !structured ||
    structured === null ||
    structured === undefined ||
    structured === '' ||
    (typeof structured === 'object' && Object.keys(structured).length === 0)
  ) {
    return true;
  }

  return false;
}

function safeJsonParse(jsonString: string): unknown {
  try {
    return JSON.parse(jsonString);
  } catch {
    return undefined;
  }
}

const addStructuredOutputs = <TTarget extends Record<any, any> | undefined | null>({
  value,
  target,
  transformItem = (_key, value) => value,
}: {
  value: unknown;
  target: TTarget;
  transformItem?: ((key: unknown, value: unknown) => unknown);
}): (TTarget & { structuredOutputs?: unknown }) => {
  if (!value) {
    return target as TTarget & { structuredOutputs?: undefined };
  }
  return Object.keys(target ?? {}).reduce(
    (acc, key) => {
      // If target is null/undefined, it wouldn't have any keys to iterate
      const value = target![key as keyof TTarget];
      if (!value) { return acc; }
      return {
        ...acc,
        [key]: transformItem(key, value)
      };
    },
    { structuredOutputs: value }
  ) as TTarget & { structuredOutputs: unknown };
};

const recurseStructuredOutputs = (output: unknown) => (_key: any, value: any) => (
  typeof value === 'object' && value !== null
    ? addStructuredOutputs({ value: output, target: value })
    : value
);

const experimentalOutputEmpty = (res: Awaited<ReturnType<Required<LanguageModelMiddleware>['wrapGenerate']>>) => {
  if (res && 'experimental_output' in res) {
    const output = res.experimental_output;
    if (
      output === null ||
      output === undefined ||
      (typeof output === 'object' &&
        Object.keys(output).length === 0)
    ) {
      return true;
    }
    res.providerMetadata = addStructuredOutputs({
      value: output,
      target: res.providerMetadata,
      transformItem: recurseStructuredOutputs(output),
    });
    return false;
  }
  return true;
};

export const originalSetNormalizedDefaultsMiddleware: LanguageModelV2Middleware =
{
  transformParams: async ({ params }) => {
    // Cast params to allow access to experimental properties
    const modifiedParams = { ...params } as typeof params & {
      experimental_telemetry?: typeof DEFAULT_TELEMETRY;
    };

    // Set default telemetry if not present
    if (!modifiedParams.experimental_telemetry) {
      modifiedParams.experimental_telemetry = DEFAULT_TELEMETRY;
    }

    return modifiedParams;
  },

  wrapGenerate: async ({ doGenerate }) => {
    const result = await doGenerate();

    if (typeof result.response?.body !== 'string') {
      return result;
    }
    result.providerMetadata = result.providerMetadata || {};
    if (isStructuredOutputEmpty(result)) {
      let jsonContent: string | undefined = undefined;

      // Check if response text is a JSON code block
      if (isJsonCodeBlock(result.response.body)) {
        jsonContent = extractJsonFromCodeBlock(result.response.body);
      }
      // Check if response text is valid JSON object
      else if (isValidJsonObject(result.response.body)) {
        jsonContent = result.response.body.trim();
      }

      if (jsonContent) {
        const parsedJson = safeJsonParse(jsonContent);

        if (parsedJson) {
          // Create modified result with structured output
          result.providerMetadata = addStructuredOutputs({
            value: parsedJson,
            target: result.providerMetadata,
            transformItem: recurseStructuredOutputs(parsedJson)
          });
          (result as { experimental_output?: unknown }).experimental_output = parsedJson;
        }
      }
    }
    return result;
  },
  wrapStream: async ({ doStream }) => {
    const { stream, ...rest } = await doStream();

    let accumulatedText = '';

    const transformStream = new TransformStream<
      LanguageModelV2StreamPart,
      LanguageModelV2StreamPart
    >({
      transform(chunk, controller) {
        // Accumulate text deltas
        if (chunk.type === 'text-delta') {
          accumulatedText += chunk.delta;
        }

        // If this is a finish chunk and we have accumulated text that could be JSON
        if (chunk.type === 'finish' && accumulatedText) {
          let jsonContent: string | null = null;

          // Check if accumulated text is a JSON code block
          if (isJsonCodeBlock(accumulatedText)) {
            jsonContent = extractJsonFromCodeBlock(accumulatedText);
          }
          // Check if accumulated text is valid JSON object
          else if (isValidJsonObject(accumulatedText)) {
            jsonContent = accumulatedText.trim();
          }

          if (jsonContent) {
            const parsedJson = safeJsonParse(jsonContent);

            if (parsedJson !== null) {
              // Modify the finish chunk to include structured output
              const chunkWithMeta = chunk as Record<string, unknown>;
              const modifiedChunk = {
                ...chunk,
                providerMetadata: {
                  ...((chunkWithMeta.providerMetadata as Record<
                    string,
                    unknown
                  >) || {}),
                  structuredOutputs: parsedJson as Record<string, JSONValue>,
                },
              };
              controller.enqueue(modifiedChunk);
              return;
            }
          }
        }

        controller.enqueue(chunk);
      },
    });

    return {
      stream: stream.pipeThrough(transformStream),
      ...rest,
    };
  },
};

export const setNormalizedDefaultsMiddleware =
  MiddlewareStateManager.Instance.basicMiddlewareWrapper({
    middlewareId: 'set-normalized-defaults',
    middleware: originalSetNormalizedDefaultsMiddleware,
  });

export default setNormalizedDefaultsMiddleware;
