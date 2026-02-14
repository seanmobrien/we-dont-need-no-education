import { LoggedError } from '@compliance-theater/logger';
import { promptTokensEstimate } from 'openai-chat-tokens';
export const countTokens = ({ prompt, enableLogging = true, }) => {
    if (prompt.length === 0) {
        return 0;
    }
    try {
        const normalizeContentToParts = (content) => {
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
        const toChatCompletionMessages = (src) => {
            const arr = Array.isArray(src)
                ? src
                : src &&
                    typeof src === 'object' &&
                    'messages' in src &&
                    Array.isArray(src.messages)
                    ? src.messages
                    : [src];
            return arr.map((msg) => {
                if (msg &&
                    typeof msg === 'object' &&
                    'role' in msg) {
                    const m = msg;
                    const rawRole = String(m['role'] ?? 'user');
                    const allowedRoles = [
                        'function',
                        'user',
                        'system',
                        'assistant',
                        'tool',
                        'developer',
                    ];
                    const role = (allowedRoles.some((r) => r === rawRole)
                        ? rawRole
                        : 'user');
                    const name = m['name'] ? String(m['name']) : '';
                    const rawContent = 'content' in m
                        ? m['content']
                        : 'text' in m
                            ? { text: m['text'] }
                            : undefined;
                    const parts = normalizeContentToParts(rawContent);
                    const contentText = parts.map((p) => p.text).join('\n');
                    const outUnk = {
                        role,
                        content: contentText,
                        ...(name ? { name } : {}),
                    };
                    return outUnk;
                }
                if (msg &&
                    typeof msg === 'object' &&
                    'text' in msg) {
                    const m = msg;
                    const parts = normalizeContentToParts(m['text']);
                    return {
                        role: 'user',
                        name: '',
                        content: parts.map((p) => p.text).join('\n'),
                    };
                }
                const parts = normalizeContentToParts(msg);
                return {
                    role: 'user',
                    name: '',
                    content: parts.map((p) => p.text).join('\n'),
                };
            });
        };
        const isPromptObject = (p) => {
            return !!(p &&
                typeof p === 'object' &&
                'messages' in p);
        };
        const rawMessages = isPromptObject(prompt) && Array.isArray(prompt.messages)
            ? prompt.messages
            : Array.isArray(prompt)
                ? prompt
                : [];
        const rawFunctions = isPromptObject(prompt) && Array.isArray(prompt.functions)
            ? prompt.functions
            : [];
        const chatMessages = toChatCompletionMessages(rawMessages);
        const functionsFromPrompt = Array.isArray(rawFunctions)
            ? rawFunctions.map((f) => {
                const rec = f && typeof f === 'object' ? f : {};
                const name = rec['name'] ? String(rec['name']) : '';
                const description = rec['description']
                    ? String(rec['description'])
                    : undefined;
                const parameters = 'parameters' in rec ? rec['parameters'] : undefined;
                const fnUnk = {
                    name,
                    ...(description ? { description } : {}),
                    ...(parameters ? { parameters } : {}),
                };
                return fnUnk;
            })
            : [];
        const inferParametersFromArgs = (args) => {
            if (args == null)
                return undefined;
            if (Array.isArray(args)) {
                return { type: 'array', items: {} };
            }
            if (typeof args === 'object') {
                const obj = args;
                const properties = {};
                for (const [k, v] of Object.entries(obj)) {
                    const t = Array.isArray(v) ? 'array' : v === null ? 'null' : typeof v;
                    properties[k] = { type: t };
                }
                return { type: 'object', properties };
            }
            return { type: typeof args };
        };
        const functionsFromToolCalls = [];
        try {
            const addIfUnique = (fn) => {
                if (!fn || !fn.name)
                    return;
                const exists = functionsFromPrompt.some((f) => f.name === fn.name) ||
                    functionsFromToolCalls.some((f) => f.name === fn.name);
                if (!exists)
                    functionsFromToolCalls.push(fn);
            };
            const scanForToolCalls = (msgs) => {
                for (const m of msgs) {
                    if (!m || typeof m !== 'object')
                        continue;
                    const rec = m;
                    const contents = rec['content'] ?? rec['text'] ?? undefined;
                    const parts = Array.isArray(contents) ? contents : [contents];
                    for (const p of parts) {
                        if (!p || typeof p !== 'object')
                            continue;
                        const part = p;
                        if (part['type'] === 'tool-call') {
                            const toolName = part['toolName'] ?? part['tool'] ?? '';
                            const args = part['args'] ?? undefined;
                            const fn = {
                                name: String(toolName || part['toolCallId'] || ''),
                                description: `tool call: ${String(toolName ?? '')}`,
                                parameters: inferParametersFromArgs(args),
                            };
                            addIfUnique(fn);
                        }
                    }
                }
            };
            if (Array.isArray(rawMessages)) {
                scanForToolCalls(rawMessages);
            }
            if (isPromptObject(prompt) &&
                'tool_choice' in prompt) {
                const tc = prompt['tool_choice'];
                if (tc && typeof tc === 'object') {
                    const rec = tc;
                    if ('function' in rec &&
                        rec['function'] &&
                        typeof rec['function'] === 'object') {
                        const frec = rec['function'];
                        const fn = {
                            name: frec['name'] ? String(frec['name']) : '',
                            description: frec['description']
                                ? String(frec['description'])
                                : undefined,
                            parameters: frec['parameters'] ?? undefined,
                        };
                        addIfUnique(fn);
                    }
                }
            }
        }
        catch {
        }
        const functions = [];
        const function_call = functions.length > 0 ? 'auto' : 'none';
        return promptTokensEstimate({
            messages: chatMessages,
            functions,
            function_call,
        });
    }
    catch (error) {
        LoggedError.isTurtlesAllTheWayDownBaby(error, {
            source: 'tokenStatsMiddleware.transformParams',
            log: enableLogging,
        });
        const promptStr = typeof prompt === 'string' ? prompt : JSON.stringify(prompt);
        return Math.ceil(promptStr.length / 4);
    }
};
//# sourceMappingURL=count-tokens.js.map