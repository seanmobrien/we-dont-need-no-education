export const extractPromptText = ({ prompt, count = 2, }) => {
    const messages = Array.isArray(prompt) ? prompt : [prompt];
    const filtered = messages.filter((msg) => msg.role === 'user' || msg.role === 'assistant');
    const exchanges = [];
    let current = null;
    for (const msg of filtered) {
        if (msg.role === 'user') {
            let content = typeof msg.content === 'string' ? msg.content : '';
            const beginIdx = content.indexOf('__BEGIN_PROMPT__');
            if (beginIdx !== -1) {
                content = content.slice(beginIdx + '__BEGIN_PROMPT__'.length);
            }
            if (current)
                exchanges.push(current);
            current = { user: content };
        }
        else if (msg.role === 'assistant' && current) {
            current.assistant = typeof msg.content === 'string' ? msg.content : '';
            exchanges.push(current);
            current = null;
        }
    }
    if (current)
        exchanges.push(current);
    const lastExchanges = exchanges.slice(-count);
    return lastExchanges.map((ex) => `user: ${ex.user}\nassistant:${ex.assistant !== undefined ? ex.assistant : ''}`);
};
//# sourceMappingURL=extract-prompt.js.map