import { LoggedError } from '@/lib/react-util/errors/logged-error';
import { ToolCallbackResult } from '../types';
import {
  SEQUENTIAL_THINKING_TOOL,
  SequentialThinkingServer,
} from './sequential-thinking-server';
import { isError } from '@/lib/react-util/utility-methods';
import { log } from '@/lib/logger';
import z from 'zod';

let sequentialThinkingTool: SequentialThinkingServer | undefined = undefined;

export const sequentialThinkingCallback = (
  arg: object,
): ToolCallbackResult<never> => {
  try {
    if (!sequentialThinkingTool) {
      sequentialThinkingTool = new SequentialThinkingServer();
    }
    let ret = sequentialThinkingTool.processThought(
      arg,
    ) as ToolCallbackResult<never>;
    if ('isError' in ret && ret.isError === true) {
      if (!('structuredContent' in ret)) {
        const asResult = ret as ToolCallbackResult<never>;
        ret = {
          content: asResult.content,
          isError: true,
          structuredContent: {
            result: {
              isError: true,
              message: (asResult.content ?? []).map((x) => x.text).join(' '),
            },
          },
        };
      }
      log((l) =>
        l.warn('Sequential thinking tool invocation error', {
          input: arg,
          result: ret,
        }),
      );
    }
    return ret;
  } catch (error) {
    LoggedError.isTurtlesAllTheWayDownBaby(error, {
      source: 'sequentialThinking',
      log: true,
    });
    const message = `An error occurred while processing your request: ${isError(error) ? error.message : String(error)}. Please try again later.`;
    return {
      role: 'tool',
      content: [{ type: 'text', text: message }],
      structuredContent: {
        result: {
          isError: true,
          message,
        },
      },
    } as ToolCallbackResult<never>;
  }
};

export const SEQUENTIAL_THINKING_TOOL_NAME = SEQUENTIAL_THINKING_TOOL.name;

export const sequentialThinkingCallbackConfig = {
  description: SEQUENTIAL_THINKING_TOOL.description,
  inputSchema: {
    thought: z.string().describe('Your current thinking step'),
    nextThoughtNeeded: z
      .boolean()
      .describe('Whether another thought step is needed'),
    thoughtNumber: z.number().min(1).describe('Current thought number'),
    totalThoughts: z
      .number()
      .min(1)
      .describe('Estimated total thoughts needed'),
    isRevision: z
      .boolean()
      .optional()
      .describe('Whether this revises previous thinking'),
    revisesThought: z
      .number()
      .describe('Which thought is being reconsidered')
      .optional(),
    branchFromThought: z
      .number()
      .optional()
      .describe('Branching point thought number'),
    branchId: z.string().describe('Branch identifier').optional(),
    needsMoreThoughts: z
      .boolean()
      .describe('If more thoughts are needed')
      .optional(),
  },
} as const;
