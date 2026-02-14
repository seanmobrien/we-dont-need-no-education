export const segregateLatestRequest = (prompt) => {
    const latest = [];
    const prior = [];
    if (!Array.isArray(prompt)) {
        return {
            latest: [prompt],
            prior: [],
        };
    }
    let i = prompt.length - 1;
    for (; i >= 0; i--) {
        const p = prompt[i];
        if (p.role !== 'assistant') {
            latest.unshift(p);
        }
        else {
            break;
        }
    }
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
            const filteredContents = p.content.filter((m) => {
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
                content: filteredContents,
            });
        }
        else {
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
//# sourceMappingURL=util.js.map