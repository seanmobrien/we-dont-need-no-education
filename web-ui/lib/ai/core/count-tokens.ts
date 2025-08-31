import { LoggedError } from '@/lib/react-util/errors/logged-error';
import { UIDataTypes, UIMessagePart, UITools } from 'ai';
import { promptTokensEstimate } from 'openai-chat-tokens';
import {
  LanguageModelV2Message,
  LanguageModelV2Prompt,
} from '@ai-sdk/provider';
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
    let asMessages: LanguageModelV2Prompt;
    // Figure out if we have a prompt or a bunch of parts; if parts, wrap in a phony prompt
    if ('role' in prompt[0]) {
      asMessages = prompt as LanguageModelV2Prompt;
    } else {
      asMessages = [
        {
          role: 'user',
          content: prompt as UIMessagePart<UIDataTypes, UITools>[],
        } as LanguageModelV2Message,
      ] as LanguageModelV2Prompt;
    }

    // TODO: include function definitions
    const functions: ChatCompletionCreateParams.Function[] = [];

    // Determine function_call setting
    const function_call = functions.length > 0 ? 'auto' : 'none';

    return promptTokensEstimate({
      messages: asMessages as ChatCompletionMessageParam[],
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
