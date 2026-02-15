import { memoryClientFactory } from '@/lib/ai/mem0/memoryclient-factory';
import type { MemoryMiddlewareAugmentationStrategy } from '../types';
import { LoggedError, log, safeSerialize } from '@compliance-theater/logger';
import { fromRequest } from '@compliance-theater/auth/lib/impersonation';
import { Messages } from '@/lib/ai/mem0/lib/client/types';

export const onOutputGenerated: MemoryMiddlewareAugmentationStrategy['onOutputGenerated'] =
  async ({
    output,
    params: { prompt: promptFromProps },
    context: { memClient },
  }) => {
    try {
      // Extract most recent exchange from input; this is defined as anything up until the last LLM response.
      const mostRecentExchangeIndex =
        promptFromProps.findIndex((x) => x.role === 'assistant') + 1;
      const mostRecentExchange: Messages = {
        role: 'user',
        content: `-- 🔎 Latest Interaction (🧱 Extraction Source) --
${JSON.stringify([
  ...promptFromProps.slice(mostRecentExchangeIndex),
  {
    role: 'assistant',
    content: output,
  },
])}`,
      };
      const conversationContext: Messages | undefined =
        mostRecentExchangeIndex > 0
          ? {
              role: 'user',
              content: `-- 🧠 Prior Interactions (🧱 Context Only) --
${JSON.stringify(promptFromProps.slice(0, mostRecentExchangeIndex))}`,
            }
          : undefined;

      const prompt: Messages = {
        role: 'system',
        content: `You are the **Memory Optimization Module** for a compliance and legal analysis engine.
Your purpose is to analyze user and engine communications and identify information from 
the most recent exchange that could be useful in future conversation or analysis and 
should be stored in the engine's Memory Submodule.  You will be provided with conversation
history, which could include:

 📌 User Input
 📌 Tool Output
 📌 LLM Engine Response

The focus of your analysis is the **Latest Interaction**.  Any information within that exchange
that is relevant to analyzing compliance with:

 - Title IX obligations
 - FERPA obligations
 - School board policy
 - State or Federal law
 - General decency and Education best practices

or is otherwise useful in building a knowledge graph that will support the engine in future analysis 
should be committed to the memory module.  Your input will include both the most recent exchange as
well as conversation history.  Historical content can be used for goal alignment, context, and validation
but should not be considered source material unless it is referenced within the most recent exchange.
Any content within the most recent exchange, including user input, tool results and engine responses, 
should be considered for memory storage.

🗂️ Inputs
`,
      };
      const allInput = [
        prompt,
        ...(conversationContext ? [conversationContext] : []),
        mostRecentExchange,
      ];
      const client =
        memClient ??
        (await memoryClientFactory({
          impersonation: await fromRequest(),
        }));
      const results = await client.add(allInput);
      console.group('Memory Middleware: onOutputGenerated');
      console.table(results);
      console.groupEnd();
      log((l) =>
        l.info(
          `memoryMiddleware:onOutputGenerated - Memory client returned [${
            results.length
          }] results: ${safeSerialize(results, { maxObjectDepth: 5 })}`
        )
      );
      return true;
    } catch (error) {
      throw LoggedError.isTurtlesAllTheWayDownBaby(error, {
        source: 'memoryMiddleware:onOutputGenerated',
        log: true,
      });
    }
  };

export default onOutputGenerated;
