import { LoggedError } from '@/lib/react-util/errors/logged-error';
import { LanguageModelV1Prompt, CoreMessage } from "ai";
import { promptTokensEstimate } from "openai-chat-tokens";


/**
 * Estimates the number of tokens in a given prompt for language model usage.
 *
 * This function processes the provided prompt, which can be either a `LanguageModelV1Prompt`
 * or an array of `CoreMessage` objects, and extracts relevant message content, tool calls,
 * and function information. It then constructs an input object suitable for token estimation
 * and returns the estimated token count using `promptTokensEstimate`.
 *
 * If an error occurs during token estimation, a fallback estimate is returned based on the
 * prompt's string length.
 *
 * @param params - An object containing:
 *   @param params.prompt - The prompt to estimate tokens for, either a `LanguageModelV1Prompt` or an array of `CoreMessage` objects.
 *   @param params.enableLogging - Optional. Whether to enable error logging. Defaults to `true`.
 * @returns The estimated number of tokens in the prompt.
 */
export const countTokens = ({prompt, enableLogging = true}: {prompt: LanguageModelV1Prompt|(CoreMessage[]), enableLogging?: boolean}): number => {
  try {
    // Extract messages, functions, and function_call from prompt
    const messages = prompt.map((msg) => {
      const content = Array.isArray(msg.content)
        ? msg.content
            .map((part) =>
              typeof part === 'string'
                ? part
                : 'text' in part
                  ? part.text
                  : '',
            )
            .join('')
        : typeof msg.content === 'string'
          ? msg.content
          : '';

      // Handle different message types properly
      if (msg.role === 'tool') {
        return {
          role: msg.role,
          content,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          tool_call_id: (msg as any).toolCallId || 'unknown',
        };
      }

      return {
        role: msg.role,
        content,
      };
    });

    // Extract functions from assistant messages with tool calls
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const functions: any[] = [];
    prompt.forEach((msg) => {
      if (
        msg.role === 'assistant' &&
        'toolCalls' in msg &&
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        Array.isArray((msg as any).toolCalls)
      ) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (msg as any).toolCalls.forEach((toolCall: any) => {
          functions.push({
            name: toolCall.toolName || toolCall.name,
            description: `Tool call: ${toolCall.toolName || toolCall.name}`,
            parameters: toolCall.args || toolCall.parameters || {},
          });
        });
      }
    });

    // Determine function_call setting
    const function_call = functions.length > 0 ? 'auto' : 'none';

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tokenEstimateInput: any = {
      messages,
      ...(functions.length > 0 && { functions }),
      ...(function_call !== 'none' && { function_call }),
    };

    return promptTokensEstimate(tokenEstimateInput);
  } catch (error) {
    LoggedError.isTurtlesAllTheWayDownBaby(error, {
      source: 'tokenStatsMiddleware.transformParams',
      log: enableLogging,          
    });
    // Return a fallback estimate if token counting fails
    const promptStr = typeof prompt === 'string' ? prompt : JSON.stringify(prompt);
    return Math.ceil(promptStr.length / 4);
  }
};
