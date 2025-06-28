import type { LanguageModelV1Middleware, LanguageModelV1StreamPart } from 'ai';
import { createHash } from 'crypto';
import { getRedisClient } from './redis-client';
import { getCacheConfig, validateCacheConfig } from './config';
import { metricsCollector } from './metrics';

// Enterprise configuration and metrics
const config = getCacheConfig();
validateCacheConfig(config);

/**
 * Creates a unique cache key from parameters and model information
 */
function createCacheKey(
  params: Record<string, unknown>,
  modelId?: string,
): string {
  const normalizeForKey = (value: unknown): string | undefined => {
    const type = typeof value;
    if (type !== 'boolean' && !value) {
      return undefined;
    }
    switch (type) {
      case 'symbol':
      case 'function':
        return undefined;
      case 'object':
        // Handle objects and arrays by sorting keys and converting to JSON
        if (Array.isArray(value)) {
          return JSON.stringify(value.map(normalizeForKey).sort());
        }
        return JSON.stringify(
          Object.entries(value as object)
            .sort(([a], [b]) => a.localeCompare(b))
            .reduce(
              (acc, [key, val]) => {
                if (val === undefined || val === null) {
                  return acc;
                }
                acc[key] = normalizeForKey(val);
                return acc;
              },
              {} as Record<string, unknown>,
            ),
        );
      default:
        return String(value);
    }
  };
  const keyData = {
    modelId: modelId || 'unknown',
    params: {
      ...params,
    },
  };
  const keyString = normalizeForKey(keyData)?.replaceAll(/\s|\\/g, '');
  if (keyString === undefined) {
    throw new Error('Cannot create cache key from undefined value');
  }
  const hash = createHash('sha256').update(keyString).digest('hex');
  return `${config.cacheKeyPrefix}:${hash}`;
}

/**
 * Cache jail key for tracking problematic responses
 */
function createJailKey(cacheKey: string): string {
  return `${config.jailKeyPrefix}:${cacheKey.replace(`${config.cacheKeyPrefix}:`, '')}`;
}

/**
 * Enterprise-grade Redis caching middleware for AI language models
 * - Configurable via environment variables
 * - Comprehensive metrics collection
 * - Caches successful responses immediately
 * - Uses "cache jail" for problematic responses (content-filter, other, warnings)
 * - Promotes jailed responses to cache after configurable threshold
 * - Never caches error responses
 */
export const cacheWithRedis: LanguageModelV1Middleware = {
  wrapGenerate: async ({ doGenerate, params, model }) => {
    const cacheKey = createCacheKey(params, model?.modelId);

    try {
      const redis = await getRedisClient();

      // Try to get cached response
      const cachedResponse = await redis.get(cacheKey);

      if (cachedResponse) {
        const parsed = JSON.parse(cachedResponse);
        const responseSize = parsed.text?.length || 0;

        // Record metrics
        if (config.enableMetrics) {
          metricsCollector.recordHit(cacheKey, responseSize);
        }

        if (config.enableLogging) {
          console.log(
            `🎯 Cache HIT for key: ${cacheKey.substring(0, config.maxKeyLogLength)}...`,
          );
        }

        return parsed as Awaited<ReturnType<typeof doGenerate>>;
      }

      // Record cache miss
      if (config.enableMetrics) {
        metricsCollector.recordMiss(cacheKey);
      }

      if (config.enableLogging) {
        console.log(
          `🔍 Cache MISS for key: ${cacheKey.substring(0, config.maxKeyLogLength)}...`,
        );
      }

      // Generate new response
      const result = await doGenerate();

      // Determine caching strategy
      const isSuccessful =
        result &&
        result.finishReason !== 'error' &&
        result.text !== undefined &&
        result.text !== null &&
        result.text.length > 0 &&
        result.finishReason !== 'other' &&
        result.finishReason !== 'content-filter' &&
        (!result.warnings || result.warnings.length === 0);

      const isProblematic =
        result &&
        result.text &&
        result.text.length > 0 &&
        result.finishReason !== 'error' && // Never jail errors
        (result.finishReason === 'other' ||
          result.finishReason === 'content-filter' ||
          (result.warnings && result.warnings.length > 0));

      if (isSuccessful) {
        // Cache successful responses immediately
        try {
          await redis.setEx(
            cacheKey,
            config.cacheTtl,
            JSON.stringify({
              text: result.text,
              finishReason: result.finishReason,
              usage: result.usage,
              warnings: result.warnings,
              rawCall: result.rawCall,
              rawResponse: result.rawResponse,
              response: result.response,
            }),
          );

          const responseSize = result.text?.length || 0;

          // Record metrics
          if (config.enableMetrics) {
            metricsCollector.recordStore(cacheKey, responseSize);
          }

          if (config.enableLogging) {
            console.log(
              `💾 Cached successful response for key: ${cacheKey.substring(0, config.maxKeyLogLength)}...`,
            );
          }
        } catch (cacheStoreError) {
          if (config.enableMetrics) {
            metricsCollector.recordError(cacheKey, String(cacheStoreError));
          }
          if (config.enableLogging) {
            console.error('Error storing response in cache:', cacheStoreError);
          }
        }
      } else if (isProblematic) {
        // Handle cache jail for problematic responses
        const jailKey = createJailKey(cacheKey);

        try {
          // Get current jail data
          const jailData = await redis.get(jailKey);
          const jailEntry = jailData
            ? JSON.parse(jailData)
            : { count: 0, firstSeen: Date.now() };

          // Increment count
          jailEntry.count += 1;
          jailEntry.lastSeen = Date.now();
          jailEntry.lastResponse = {
            finishReason: result.finishReason,
            hasWarnings: !!(result.warnings && result.warnings.length > 0),
            textLength: result.text?.length || 0,
          };

          // Store updated jail entry
          await redis.setEx(jailKey, config.jailTtl, JSON.stringify(jailEntry));

          // Record metrics
          if (config.enableMetrics) {
            metricsCollector.recordJailUpdate(
              cacheKey,
              jailEntry.count,
              config.jailThreshold,
            );
          }

          if (config.enableLogging) {
            console.log(
              `🏪 Cache jail updated for key ${cacheKey.substring(0, config.maxKeyLogLength)}... (count: ${jailEntry.count}/${config.jailThreshold})`,
            );
          }

          // Check if we've hit the threshold
          if (jailEntry.count >= config.jailThreshold) {
            if (config.enableLogging) {
              console.log(
                `🔓 Cache jail threshold reached for key ${cacheKey.substring(0, config.maxKeyLogLength)}... - promoting to cache`,
              );
            }

            // Promote to cache
            await redis.setEx(
              cacheKey,
              config.cacheTtl,
              JSON.stringify({
                text: result.text,
                finishReason: result.finishReason,
                usage: result.usage,
                warnings: result.warnings,
                rawCall: result.rawCall,
                rawResponse: result.rawResponse,
                response: result.response,
              }),
            );

            const responseSize = result.text?.length || 0;

            // Record metrics
            if (config.enableMetrics) {
              metricsCollector.recordJailPromotion(cacheKey, responseSize);
            }

            if (config.enableLogging) {
              console.log(
                `💾 Cached problematic response after jail threshold for key: ${cacheKey.substring(0, config.maxKeyLogLength)}...`,
              );
            }
          }
        } catch (jailError) {
          if (config.enableMetrics) {
            metricsCollector.recordError(cacheKey, String(jailError));
          }
          if (config.enableLogging) {
            console.error('Error managing cache jail:', jailError);
          }
        }
      } else {
        // Log why we're not caching
        if (config.enableLogging) {
          console.log(
            `❌ Not caching response (finishReason: ${result.finishReason}, hasText: ${!!(result.text && result.text.length > 0)}) for key: ${cacheKey.substring(0, config.maxKeyLogLength)}...`,
          );
        }
      }

      return result;
    } catch (error) {
      if (config.enableMetrics) {
        metricsCollector.recordError(cacheKey, String(error));
      }
      if (config.enableLogging) {
        console.error('Redis cache error in wrapGenerate:', error);
      }
      return await doGenerate();
    }
  },

  wrapStream: async ({ doStream, params, model }) => {
    const cacheKey = createCacheKey(params, model?.modelId);

    try {
      const redis = await getRedisClient();

      // Try to get cached response
      const cachedResponse = await redis.get(cacheKey);

      if (cachedResponse) {
        const parsed = JSON.parse(cachedResponse);
        const responseSize = parsed.text?.length || 0;

        // Record metrics
        if (config.enableMetrics) {
          metricsCollector.recordHit(cacheKey, responseSize);
        }

        if (config.enableLogging) {
          console.log(
            `🎯 Stream Cache HIT for key: ${cacheKey.substring(0, config.maxKeyLogLength)}...`,
          );
        }

        // Convert cached text back to a stream
        const cachedStream = new ReadableStream<LanguageModelV1StreamPart>({
          start(controller) {
            // Emit text deltas to simulate streaming
            const text = parsed.text || '';

            for (let i = 0; i < text.length; i += config.streamChunkSize) {
              const chunk = text.slice(i, i + config.streamChunkSize);
              controller.enqueue({
                type: 'text-delta',
                textDelta: chunk,
              });
            }

            // Emit finish event
            controller.enqueue({
              type: 'finish',
              finishReason: parsed.finishReason || 'stop',
              usage: parsed.usage,
            });

            controller.close();
          },
        });

        return {
          stream: cachedStream,
          warnings: parsed.warnings,
          rawCall: parsed.rawCall,
          rawResponse: parsed.rawResponse,
        };
      }

      // Record cache miss
      if (config.enableMetrics) {
        metricsCollector.recordMiss(cacheKey);
      }

      if (config.enableLogging) {
        console.log(
          `🔍 Stream Cache MISS for key: ${cacheKey.substring(0, config.maxKeyLogLength)}...`,
        );
      }

      // Generate new stream
      const { stream, ...rest } = await doStream();

      let generatedText = '';
      let finishReason = 'stop';
      let usage: Record<string, unknown> | undefined = undefined;

      const cacheStream = new TransformStream<
        LanguageModelV1StreamPart,
        LanguageModelV1StreamPart
      >({
        transform(chunk, controller) {
          if (chunk.type === 'text-delta') {
            generatedText += chunk.textDelta;
          } else if (chunk.type === 'finish') {
            finishReason = chunk.finishReason;
            usage = chunk.usage;
          }

          controller.enqueue(chunk);
        },

        async flush() {
          // Determine caching strategy for streaming response
          const isSuccessful =
            generatedText &&
            finishReason !== 'error' &&
            generatedText.length > 0 &&
            finishReason !== 'other' &&
            finishReason !== 'content-filter' &&
            (!rest.warnings || rest.warnings.length === 0);

          const isProblematic =
            generatedText &&
            generatedText.length > 0 &&
            finishReason !== 'error' && // Never jail errors
            (finishReason === 'other' ||
              finishReason === 'content-filter' ||
              (rest.warnings && rest.warnings.length > 0));

          if (isSuccessful) {
            // Cache successful streaming responses immediately
            try {
              await redis.setEx(
                cacheKey,
                config.cacheTtl,
                JSON.stringify({
                  text: generatedText,
                  finishReason,
                  usage,
                  warnings: rest.warnings,
                  rawCall: rest.rawCall,
                  rawResponse: rest.rawResponse,
                }),
              );

              const responseSize = generatedText?.length || 0;

              // Record metrics
              if (config.enableMetrics) {
                metricsCollector.recordStore(cacheKey, responseSize);
              }

              if (config.enableLogging) {
                console.log(
                  `💾 Cached successful stream response for key: ${cacheKey.substring(0, config.maxKeyLogLength)}...`,
                );
              }
            } catch (cacheError) {
              if (config.enableMetrics) {
                metricsCollector.recordError(cacheKey, String(cacheError));
              }
              if (config.enableLogging) {
                console.error('Error caching stream response:', cacheError);
              }
            }
          } else if (isProblematic) {
            // Handle cache jail for problematic streaming responses
            const jailKey = createJailKey(cacheKey);

            try {
              // Get current jail data
              const jailData = await redis.get(jailKey);
              const jailEntry = jailData
                ? JSON.parse(jailData)
                : { count: 0, firstSeen: Date.now() };

              // Increment count
              jailEntry.count += 1;
              jailEntry.lastSeen = Date.now();
              jailEntry.lastResponse = {
                finishReason: finishReason,
                hasWarnings: !!(rest.warnings && rest.warnings.length > 0),
                textLength: generatedText?.length || 0,
              };

              // Store updated jail entry
              await redis.setEx(
                jailKey,
                config.jailTtl,
                JSON.stringify(jailEntry),
              );

              // Record metrics
              if (config.enableMetrics) {
                metricsCollector.recordJailUpdate(
                  cacheKey,
                  jailEntry.count,
                  config.jailThreshold,
                );
              }

              if (config.enableLogging) {
                console.log(
                  `🏪 Stream cache jail updated for key ${cacheKey.substring(0, config.maxKeyLogLength)}... (count: ${jailEntry.count}/${config.jailThreshold})`,
                );
              }

              // Check if we've hit the threshold
              if (jailEntry.count >= config.jailThreshold) {
                if (config.enableLogging) {
                  console.log(
                    `🔓 Stream cache jail threshold reached for key ${cacheKey.substring(0, config.maxKeyLogLength)}... - promoting to cache`,
                  );
                }

                // Promote to cache
                await redis.setEx(
                  cacheKey,
                  config.cacheTtl,
                  JSON.stringify({
                    text: generatedText,
                    finishReason,
                    usage,
                    warnings: rest.warnings,
                    rawCall: rest.rawCall,
                    rawResponse: rest.rawResponse,
                  }),
                );

                const responseSize = generatedText?.length || 0;

                // Record metrics
                if (config.enableMetrics) {
                  metricsCollector.recordJailPromotion(cacheKey, responseSize);
                }

                if (config.enableLogging) {
                  console.log(
                    `💾 Cached problematic stream response after jail threshold for key: ${cacheKey.substring(0, config.maxKeyLogLength)}...`,
                  );
                }
              }
            } catch (jailError) {
              if (config.enableMetrics) {
                metricsCollector.recordError(cacheKey, String(jailError));
              }
              if (config.enableLogging) {
                console.error('Error managing stream cache jail:', jailError);
              }
            }
          } else {
            if (config.enableLogging) {
              console.log(
                `❌ Not caching stream response (finishReason: ${finishReason}, textLength: ${generatedText.length}) for key: ${cacheKey.substring(0, config.maxKeyLogLength)}...`,
              );
            }
          }
        },
      });

      return {
        stream: stream.pipeThrough(cacheStream),
        ...rest,
      };
    } catch (error) {
      if (config.enableMetrics) {
        metricsCollector.recordError(cacheKey, String(error));
      }
      if (config.enableLogging) {
        console.error('Redis cache error in wrapStream:', error);
      }
      return await doStream();
    }
  },

  transformParams: async ({ params }) => {
    // No parameter transformation needed for caching
    return params;
  },
};
