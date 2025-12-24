import { LoggedError } from '@/lib/react-util/errors/logged-error';
import { UIDataTypes, UIMessagePart, UITools } from 'ai';
import { promptTokensEstimate } from 'openai-chat-tokens';
import { LanguageModelV2Prompt } from '@ai-sdk/provider';
import {
  ChatCompletionCreateParams,
  ChatCompletionMessageParam,
} from 'openai/resources/index.mjs';

/**
 * Estimates the number of tokens in a given prompt for language model usage.
 *
 * This function processes the provided prompt, which can be either a `LanguageModelPrompt`
 * or an array of `CoreMessage` objects, and extracts relevant message content, tool calls,
 * and function information. It then constructs an input object suitable for token estimation
 * and returns the estimated token count using `promptTokensEstimate`.
 *
 * If an error occurs during token estimation, a fallback estimate is returned based on the
 * prompt's string length.
 *
 * @param params - An object containing:
 *   @param params.prompt - The prompt to estimate tokens for, either a `LanguageModelPrompt` or an array of `CoreMessage` objects.
 *   @param params.enableLogging - Optional. Whether to enable error logging. Defaults to `true`.
 * @returns The estimated number of tokens in the prompt.
 */
export const countTokens = ({
  prompt,
  enableLogging = true,
}: {
  prompt: LanguageModelV2Prompt | UIMessagePart<UIDataTypes, UITools>[];
  enableLogging?: boolean;
}): number => {
  if (prompt.length === 0) {
    return 0;
  }
  try {
    // Normalize incoming prompt into OpenAI ChatCompletionMessageParam[]
    const normalizeContentToParts = (
      content: unknown,
    ): {
      [K in string]: K extends 'text' ? string : unknown;
    }[] => {
      if (!content) {
        return [];
      }
      if (typeof content !== 'object') {
        return [{ text: String(content) }];
      }
      if ('text' in content) {
        return [
          ...('content' in content
            ? normalizeContentToParts(content.content)
            : []),
          {
            ...content,
            content: undefined,
            text: String(content.text),
          },
        ];
      }
      if (Array.isArray(content)) {
        return content.flatMap(normalizeContentToParts);
      }
      return [{ text: JSON.stringify(content) }];
    };

    const toChatCompletionMessages = (
      src: unknown,
    ): ChatCompletionMessageParam[] => {
      const arr = Array.isArray(src)
        ? (src as unknown[])
        : src &&
            typeof src === 'object' &&
            'messages' in (src as Record<string, unknown>) &&
            Array.isArray((src as Record<string, unknown>).messages)
          ? ((src as Record<string, unknown>).messages as unknown[])
          : [src];
      return arr.map((msg) => {
        // If message already has a role (LanguageModelV2Message-like)
        if (
          msg &&
          typeof msg === 'object' &&
          'role' in (msg as Record<string, unknown>)
        ) {
          const m = msg as Record<string, unknown>;
          const rawRole = String(m['role'] ?? 'user');
          const allowedRoles = [
            'function',
            'user',
            'system',
            'assistant',
            'tool',
            'developer',
          ] as const;
          const role = (
            allowedRoles.some((r) => r === rawRole)
              ? (rawRole as ChatCompletionMessageParam['role'])
              : 'user'
          ) as ChatCompletionMessageParam['role'];
          const name = m['name'] ? String(m['name']) : '';
          const rawContent =
            'content' in m
              ? m['content']
              : 'text' in m
                ? { text: m['text'] }
                : undefined;
          const parts = normalizeContentToParts(rawContent);
          const contentText = parts.map((p) => p.text).join('\n');
          const outUnk: unknown = {
            role,
            content: contentText,
            ...(name ? { name } : {}),
          };
          return outUnk as ChatCompletionMessageParam;
        }

        // Legacy/simple message with `.text`
        if (
          msg &&
          typeof msg === 'object' &&
          'text' in (msg as Record<string, unknown>)
        ) {
          const m = msg as Record<string, unknown>;
          const parts = normalizeContentToParts(m['text']);
          return {
            role: 'user',
            name: '',
            content: parts.map((p) => p.text).join('\n'),
          } as ChatCompletionMessageParam;
        }

        // Fallback: treat item as a content blob
        const parts = normalizeContentToParts(msg);
        return {
          role: 'user',
          name: '',
          content: parts.map((p) => p.text).join('\n'),
        } as ChatCompletionMessageParam;
      });
    };

    // Normalize prompt source: it may be an array of messages or an object
    // with { messages: [], functions: [] } (LanguageModelV2Prompt-like).
    const isPromptObject = (p: unknown): p is Record<string, unknown> => {
      return !!(
        p &&
        typeof p === 'object' &&
        'messages' in (p as Record<string, unknown>)
      );
    };

    const rawMessages =
      isPromptObject(prompt) && Array.isArray(prompt.messages)
        ? prompt.messages
        : Array.isArray(prompt)
          ? prompt
          : [];
    const rawFunctions =
      isPromptObject(prompt) && Array.isArray(prompt.functions)
        ? prompt.functions
        : ([] as unknown[]);

    const chatMessages = toChatCompletionMessages(rawMessages);

    // Map raw function definitions (if any) into ChatCompletionCreateParams.Function[].
    const functionsFromPrompt: ChatCompletionCreateParams.Function[] =
      Array.isArray(rawFunctions)
        ? rawFunctions.map((f) => {
            const rec =
              f && typeof f === 'object' ? (f as Record<string, unknown>) : {};
            const name = rec['name'] ? String(rec['name']) : '';
            const description = rec['description']
              ? String(rec['description'])
              : undefined;
            // parameters may be a JSON schema object; keep as unknown and cast safely
            const parameters =
              'parameters' in rec ? (rec['parameters'] as unknown) : undefined;
            const fnUnk: unknown = {
              name,
              ...(description ? { description } : {}),
              ...(parameters ? { parameters } : {}),
            };
            return fnUnk as ChatCompletionCreateParams.Function;
          })
        : [];

    // Helper: infer a minimal JSON-schema-like parameters object from runtime args
    const inferParametersFromArgs = (args: unknown): unknown => {
      if (args == null) return undefined;
      if (Array.isArray(args)) {
        return { type: 'array', items: {} };
      }
      if (typeof args === 'object') {
        const obj = args as Record<string, unknown>;
        const properties: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(obj)) {
          const t = Array.isArray(v) ? 'array' : v === null ? 'null' : typeof v;
          properties[k] = { type: t };
        }
        return { type: 'object', properties };
      }
      return { type: typeof args };
    };

    // Extract function definitions from any tool-call parts found in messages
    const functionsFromToolCalls: ChatCompletionCreateParams.Function[] = [];
    try {
      const addIfUnique = (fn: ChatCompletionCreateParams.Function) => {
        if (!fn || !fn.name) return;
        const exists =
          functionsFromPrompt.some((f) => f.name === fn.name) ||
          functionsFromToolCalls.some((f) => f.name === fn.name);
        if (!exists) functionsFromToolCalls.push(fn);
      };

      const scanForToolCalls = (msgs: unknown[]) => {
        for (const m of msgs) {
          if (!m || typeof m !== 'object') continue;
          const rec = m as Record<string, unknown>;
          const contents = rec['content'] ?? rec['text'] ?? undefined;
          const parts = Array.isArray(contents) ? contents : [contents];
          for (const p of parts) {
            if (!p || typeof p !== 'object') continue;
            const part = p as Record<string, unknown>;
            if (part['type'] === 'tool-call') {
              const toolName = part['toolName'] ?? part['tool'] ?? '';
              const args = part['args'] ?? undefined;
              const fn: unknown = {
                name: String(toolName || part['toolCallId'] || ''),
                description: `tool call: ${String(toolName ?? '')}`,
                parameters: inferParametersFromArgs(args),
              };
              addIfUnique(fn as ChatCompletionCreateParams.Function);
            }
          }
        }
      };

      if (Array.isArray(rawMessages)) {
        scanForToolCalls(rawMessages as unknown[]);
      }

      // Also consider prompt-level tool_choice if present (OpenAI style)
      if (
        isPromptObject(prompt) &&
        'tool_choice' in (prompt as Record<string, unknown>)
      ) {
        const tc = (prompt as Record<string, unknown>)['tool_choice'];
        if (tc && typeof tc === 'object') {
          const rec = tc as Record<string, unknown>;
          // Named tool choice may have .function with name/description/parameters
          if (
            'function' in rec &&
            rec['function'] &&
            typeof rec['function'] === 'object'
          ) {
            const frec = rec['function'] as Record<string, unknown>;
            const fn: unknown = {
              name: frec['name'] ? String(frec['name']) : '',
              description: frec['description']
                ? String(frec['description'])
                : undefined,
              parameters: frec['parameters'] ?? undefined,
            };
            addIfUnique(fn as ChatCompletionCreateParams.Function);
          }
        }
      }
    } catch {
      // best-effort; don't let extraction failures block token counting
    }

    const functions: ChatCompletionCreateParams.Function[] = [
      // ...functionsFromPrompt,
      // ...functionsFromToolCalls,
    ];

    // Determine function_call setting supported by the chat tokens estimator
    const function_call: ChatCompletionCreateParams['function_call'] =
      functions.length > 0 ? 'auto' : 'none';

    return promptTokensEstimate({
      messages: chatMessages,
      functions,
      function_call,
    });
  } catch (error) {
    LoggedError.isTurtlesAllTheWayDownBaby(error, {
      source: 'tokenStatsMiddleware.transformParams',
      log: enableLogging,
    });
    // Return a fallback estimate if token counting fails
    const promptStr =
      typeof prompt === 'string' ? prompt : JSON.stringify(prompt);
    return Math.ceil(promptStr.length / 4);
  }
};
