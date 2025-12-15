import type {
  LanguageModelV2Message,
  LanguageModelV2Prompt,
} from '@ai-sdk/provider';

export const segregateLatestRequest = (prompt: LanguageModelV2Prompt) => {
  const latest: Array<LanguageModelV2Message> = [];
  const prior: Array<LanguageModelV2Message> = [];
  if (!Array.isArray(prompt)) {
    return {
      latest: [prompt],
      prior: [],
    };
  }

  // Run backwards until we encounter an assistant response  
  let i = prompt.length - 1;
  for (; i >= 0; i--) {
    const p = prompt[i];
    if (p.role !== 'assistant') {
      latest.unshift(p);
    } else {
      // Break out of loop to keep iterator at this position
      break;
    }
  }
  // All remaining messages are prior and should have tool 
  // requests and responses stripped out
  for (let j = 0; j <= i; j++) {
    const p = prompt[j];
    if (p.content === undefined) {
      continue;
    }
    if (typeof p.content === 'string') {
      prior.push(p);
      continue;
    }
    if (Array.isArray(p.content)) {
      type LanguageModelV2MessageContent = LanguageModelV2Message['content'] extends infer TContent
        ? TContent extends string
        ? string
        : TContent extends Array<infer ArrayItemType>
        ? ArrayItemType
        : never
        : never;

      const filteredContents = p.content.filter((m: LanguageModelV2MessageContent) => {
        if (typeof m === 'object' && !!m && (m.type === 'tool-call' || m.type === 'tool-result')) {
          return false;
        }
        return true;
      });
      if (filteredContents.length === 0) {
        continue;
      }
      prior.push({
        ...p,
        content: filteredContents as any,
      });
    } else {
      prior.push(p);
      if (p.role === 'user' || p.role === 'assistant' || p.role === 'system') {
        prior.push(p);
      }
    }
  }

  return {
    latest,
    prior,
  };
};

