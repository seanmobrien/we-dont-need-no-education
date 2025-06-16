import { LanguageModelV1Prompt } from 'ai';
import { Mem0ConfigSettings } from './mem0-types';
import { loadApiKey, getMem0ApiUrl } from '../../pollyfills';

interface Message {
  role: string;
  content: string | Array<{ type: string; text: string }>;
}

const flattenPrompt = (prompt: LanguageModelV1Prompt) => {
  try {
    return prompt
      .map((part) => {
        if (part.role === 'user') {
          return part.content
            .filter((obj) => obj.type === 'text')
            .map((obj) => obj.text)
            .join(' ');
        }
        return '';
      })
      .join(' ');
  } catch (error) {
    console.error('Error in flattenPrompt:', error);
    return '';
  }
};

const convertToMem0Format = (messages: LanguageModelV1Prompt) => {
  try {
    return messages.flatMap((message: any) => {
      try {
        if (typeof message.content === 'string') {
          return {
            role: message.role,
            content: message.content,
          };
        } else {
          return message.content
            .map((obj: any) => {
              try {
                if (obj.type === 'text') {
                  return {
                    role: message.role,
                    content: obj.text,
                  };
                }
                return null;
              } catch (error) {
                console.error('Error processing content object:', error);
                return null;
              }
            })
            .filter((item: null) => item !== null);
        }
      } catch (error) {
        console.error('Error processing message:', error);
        return [];
      }
    });
  } catch (error) {
    console.error('Error in convertToMem0Format:', error);
    return [];
  }
};

const searchInternalMemories = async (
  query: string,
  config?: Mem0ConfigSettings,
  top_k: number = 5,
) => {
  try {
    const apiKey = loadApiKey({
      apiKey: config && config.mem0ApiKey,
      environmentVariableName: 'MEM0_API_KEY',
      description: 'Mem0',
    });

    const options = {
      method: 'GET',
      headers: {
        Authorization: `Token ${apiKey}`,
        'Content-Type': 'application/json',
      },
    };

    const response = await fetch('https://api.mem0.ai/v1/memories/', options);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();

    // Apply local filtering and ranking based on the query
    const filteredMemories = data.results
      .filter((memory: any) => memory.memory.includes(query))
      .slice(0, top_k);

    return {
      results: filteredMemories,
      relations: data.relations?.length ? data.relations : undefined,
    } as {
      results: Array<{
        memory: string;
        metadata?: Record<string, any>;
        categories?: Array<string>;
        created_at?: string;
        updated_at?: string;
      }>;
      relations?: Array<{
        source: string;
        target: string;
        relationship: string;
      }>;
    };
  } catch (error) {
    console.error('Error in searchInternalMemories:', error);
    throw error;
  }
};

const addMemories = async (
  messages: LanguageModelV1Prompt,
  config?: Mem0ConfigSettings,
) => {
  try {
    let finalMessages: Array<Message> = [];
    if (typeof messages === 'string') {
      finalMessages = [{ role: 'user', content: messages }];
    } else {
      finalMessages = convertToMem0Format(messages);
    }
    const response = await updateMemories(finalMessages, config);
    return response;
  } catch (error) {
    console.error('Error in addMemories:', error);
    throw error;
  }
};

const updateMemories = async (
  messages: Array<Message>,
  config?: Mem0ConfigSettings,
) => {
  try {
    const apiKey = loadApiKey({
      apiKey: config && config.mem0ApiKey,
      environmentVariableName: 'MEM0_API_KEY',
      description: 'Mem0',
    });

    const options = {
      method: 'POST',
      headers: {
        Authorization: `Token ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ messages, ...config }),
    };

    const response = await fetch('https://api.mem0.ai/v1/memories/', options);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error in updateMemories:', error);
    throw error;
  }
};

const retrieveMemories = async (
  prompt: LanguageModelV1Prompt | string,
  config?: Mem0ConfigSettings,
) => {
  try {
    const message = typeof prompt === 'string' ? prompt : flattenPrompt(prompt);
    const systemPrompt =
      "These are the memories I have stored. Give more weightage to the question by users and try to answer that first. You have to modify your answer based on the memories I have provided. If the memories are irrelevant you can ignore them. Also don't reply to this section of the prompt, or the memories, they are only for your reference. The System prompt starts after text System Message: \n\n";

    const memories = await searchInternalMemories(message, config);
    let memoriesText1 = '';
    let memoriesText2 = '';
    let graphPrompt = '';

    try {
      memoriesText1 = memories?.results
        ?.map((memory: any) => {
          return `Memory: ${memory.memory}\n\n`;
        })
        .join('\n\n');

      if (config?.enable_graph && memories?.relations?.length) {
        memoriesText2 = memories.relations
          ?.map((memory: any) => {
            return `Relation: ${memory.source} -> ${memory.relationship} -> ${memory.target} \n\n`;
          })
          .join('\n\n');
        graphPrompt = `HERE ARE THE GRAPHS RELATIONS FOR THE PREFERENCES OF THE USER:\n\n ${memoriesText2}`;
      }
    } catch (error) {
      console.error('Error while parsing memories:', error);
    }

    if (!memories || memories?.results?.length === 0) {
      return '';
    }

    return `System Message: ${systemPrompt} ${memoriesText1} ${graphPrompt}`;
  } catch (error) {
    console.error('Error in retrieveMemories:', error);
    throw error;
  }
};

const getMemories = async (
  prompt: LanguageModelV1Prompt | string,
  config?: Mem0ConfigSettings,
) => {
  try {
    const message = typeof prompt === 'string' ? prompt : flattenPrompt(prompt);
    const memories = await searchInternalMemories(message, config);

    if (!config?.enable_graph) {
      return memories?.results;
    }
    return memories;
  } catch (error) {
    console.error('Error in getMemories:', error);
    throw error;
  }
};

const searchMemories = async (
  prompt: LanguageModelV1Prompt | string,
  config?: Mem0ConfigSettings,
) => {
  try {
    const message = typeof prompt === 'string' ? prompt : flattenPrompt(prompt);
    const memories = await searchInternalMemories(message, config);
    return memories;
  } catch (error) {
    console.error('Error in searchMemories:', error);
    return [];
  }
};

export {
  addMemories,
  updateMemories,
  retrieveMemories,
  flattenPrompt,
  searchMemories,
  getMemories,
};
