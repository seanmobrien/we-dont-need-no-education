import type {
  JSONValue,
  LanguageModelV2Middleware,
  LanguageModelV2StreamPart,
} from '@ai-sdk/provider';

/**
 * Default telemetry configuration for normalized chat requests
 */
const DEFAULT_TELEMETRY = {
  isEnabled: true,
  functionId: 'generic-chat-request',
  metadata: {},
} as const;

const jsonExpression = () =>
  /\`\`\`json[\s\n\r]*((?:\[[\s\n\r]*)?{[\s\S]*?}(?:[\s\n\r]*\])?)[\s\n\r]*\`\`\`/;

/**
 * Checks if response text is wrapped in ```json blocks
 */
function isJsonCodeBlock(text: string): boolean {
  return jsonExpression().test(text);
}

/**
 * Checks if response text is valid JSON (starts with {, ends with }, and parses successfully)
 */
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

/**
 * Extracts JSON content from ```json code blocks
 */
export const extractJsonFromCodeBlock = (text: string): string => {
  const match = jsonExpression().exec(text);
  if (!match) {
    throw new Error('No valid JSON code block found');
  }
  return match[1];
};

/**
 * Checks if structured output is empty or blank
 */
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

/**
 * Safely parses JSON string, returns null if invalid
 */
function safeJsonParse(jsonString: string): unknown {
  try {
    return JSON.parse(jsonString);
  } catch {
    return undefined;
  }
}

/**
 * Set Normalized Defaults Middleware
 *
 * This middleware:
 * 1. On request: Sets default experimental_telemetry if not present
 * 2. On response: Detects JSON code blocks and valid JSON objects, converts to structured output if structured output is empty
 */
export const setNormalizedDefaultsMiddleware: LanguageModelV2Middleware = {
  /**
   * Transform parameters to add default telemetry if missing
   */
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

  /**
   * Wrap generate to post-process response for JSON code blocks and valid JSON objects
   */
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
          const modifiedResult = {
            ...result,
            providerMetadata: {
              ...((result.providerMetadata as Record<string, unknown>) || {}),
              structuredOutputs: parsedJson as Record<string, JSONValue>,
            },
          };

          return modifiedResult;
        }
      }
    }

    return result;
  },

  /**
   * Wrap stream to post-process response for JSON code blocks and valid JSON objects
   */
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

export default setNormalizedDefaultsMiddleware;
