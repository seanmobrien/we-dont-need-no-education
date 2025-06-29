import { LanguageModelV1CallOptions } from 'ai';

export const extractPromptText = ({
  prompt,
  count = 2,
}: {
  prompt: LanguageModelV1CallOptions['prompt'];
  count?: number;
}) => {
  // Extracts the last `count` exchanges from the prompt.  Return as a string array, with output formated user: [user prompt]\nassistant:[assistant]
  // Exclude system messages, tool calls/results, etc.

  // Normalize prompt to array of messages
  const messages = Array.isArray(prompt) ? prompt : [prompt];

  // Filter only user/assistant messages
  const filtered = messages.filter(
    (msg: any) => msg.role === 'user' || msg.role === 'assistant',
  );

  // Group into exchanges: [user, assistant], [user, assistant], ...
  const exchanges: { user: string; assistant?: string }[] = [];
  let current: { user: string; assistant?: string } | null = null;
  for (const msg of filtered) {
    if (msg.role === 'user') {
      let content = typeof msg.content === 'string' ? msg.content : '';
      // Exclude any content before __BEGIN_PROMPT__, including the indicator
      const beginIdx = content.indexOf('__BEGIN_PROMPT__');
      if (beginIdx !== -1) {
        content = content.slice(beginIdx + '__BEGIN_PROMPT__'.length);
      }
      if (current) exchanges.push(current);
      current = { user: content };
    } else if (msg.role === 'assistant' && current) {
      current.assistant = typeof msg.content === 'string' ? msg.content : '';
      exchanges.push(current);
      current = null;
    }
  }
  if (current) exchanges.push(current);

  // Take last `count` exchanges
  const lastExchanges = exchanges.slice(-count);

  // Format as requested
  return lastExchanges.map(
    (ex) =>
      `user: ${ex.user}\nassistant:${ex.assistant !== undefined ? ex.assistant : ''}`,
  );
};
