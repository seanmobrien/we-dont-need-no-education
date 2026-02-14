export function exportToCsv(turns, selectedItems, chatTitle) {
    const messages = getSelectedMessages(turns, selectedItems);
    if (messages.length === 0) {
        throw new Error('No messages selected for export');
    }
    const csvContent = generateCsvContent(messages);
    const filename = `chat-export-${chatTitle ? sanitizeFilename(chatTitle) : 'untitled'}-${new Date().toISOString().slice(0, 10)}.csv`;
    downloadFile(csvContent, filename, 'text/csv');
}
export function exportToMarkdown(turns, selectedItems, chatTitle, chatCreatedAt) {
    const messages = getSelectedMessages(turns, selectedItems);
    if (messages.length === 0) {
        throw new Error('No messages selected for export');
    }
    const markdownContent = generateMarkdownContent(messages, chatTitle, chatCreatedAt);
    const filename = `chat-export-${chatTitle ? sanitizeFilename(chatTitle) : 'untitled'}-${new Date().toISOString().slice(0, 10)}.md`;
    downloadFile(markdownContent, filename, 'text/markdown');
}
const getSelectedMessages = (turns, selectedItems) => {
    const messages = [];
    for (const item of selectedItems) {
        const turn = turns.find((t) => t.turnId === item.turnId);
        if (!turn)
            continue;
        if (item.type === 'turn') {
            messages.push(...turn.messages);
        }
        else if (item.type === 'message' && item.messageId !== undefined) {
            const message = turn.messages.find((m) => m.messageId === item.messageId);
            if (message) {
                messages.push(message);
            }
        }
    }
    return messages.sort((a, b) => {
        if (a.turnId !== b.turnId) {
            return a.turnId - b.turnId;
        }
        return a.messageOrder - b.messageOrder;
    });
};
const generateCsvContent = (messages) => {
    const headers = [
        'Turn ID',
        'Message ID',
        'Role',
        'Content',
        'Tool Name',
        'Message Order',
        'Provider ID',
    ];
    const rows = messages.map((message) => [
        message.turnId.toString(),
        message.messageId.toString(),
        message.role,
        escapeCsvField(message.content || ''),
        message.toolName || '',
        message.messageOrder.toString(),
        message.providerId || '',
    ]);
    const csvLines = [headers.join(','), ...rows.map((row) => row.join(','))];
    return csvLines.join('\n');
};
const generateMarkdownContent = (messages, chatTitle, chatCreatedAt) => {
    const lines = [];
    lines.push(`# Chat Export: ${chatTitle || 'Untitled Chat'}`);
    lines.push('');
    if (chatCreatedAt) {
        lines.push(`**Created:** ${new Date(chatCreatedAt).toLocaleString()}`);
        lines.push('');
    }
    lines.push(`**Exported:** ${new Date().toLocaleString()}`);
    lines.push(`**Total Messages:** ${messages.length}`);
    lines.push('');
    lines.push('---');
    lines.push('');
    const turnGroups = new Map();
    for (const message of messages) {
        if (!turnGroups.has(message.turnId)) {
            turnGroups.set(message.turnId, []);
        }
        turnGroups.get(message.turnId).push(message);
    }
    for (const [turnId, turnMessages] of Array.from(turnGroups.entries()).sort(([a], [b]) => a - b)) {
        lines.push(`## Turn ${turnId}`);
        lines.push('');
        for (const message of turnMessages.sort((a, b) => a.messageOrder - b.messageOrder)) {
            let messageHeader = `**${capitalizeRole(message.role)}**`;
            if (message.toolName) {
                messageHeader += ` (Tool: ${message.toolName})`;
            }
            lines.push(messageHeader);
            lines.push('');
            if (message.content) {
                if (typeof message.content === 'string') {
                    lines.push(message.content);
                }
                else {
                    lines.push('```json');
                    lines.push(JSON.stringify(message.content, null, 2));
                    lines.push('```');
                }
            }
            else {
                lines.push('*No content*');
            }
            lines.push('');
            lines.push('---');
            lines.push('');
        }
    }
    return lines.join('\n');
};
const escapeCsvField = (field) => {
    if (field.includes(',') || field.includes('\n') || field.includes('"')) {
        return `"${field.replace(/"/g, '""')}"`;
    }
    return field;
};
const capitalizeRole = (role) => {
    return role.charAt(0).toUpperCase() + role.slice(1);
};
const sanitizeFilename = (filename) => {
    return filename.replace(/[<>:"/\\|?*]/g, '-').replace(/\s+/g, '-');
};
const downloadFile = (content, filename, mimeType) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};
//# sourceMappingURL=export.js.map