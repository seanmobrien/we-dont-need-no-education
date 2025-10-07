/**
 * Chat Export Utilities
 *
 * Provides functions to export selected chat messages to various formats:
 * - CSV: Tabular format with columns for timestamp, role, content, etc.
 * - Markdown: Structured text format with headers and timestamps
 */

import type { ChatMessage, ChatTurn } from '/lib/ai/chat/types';

export interface SelectedChatItem {
  type: 'turn' | 'message';
  turnId: number;
  messageId?: number; // Only set when type is 'message'
}

/**
 * Export selected chat items to CSV format
 */
export function exportToCsv(
  turns: ChatTurn[],
  selectedItems: SelectedChatItem[],
  chatTitle?: string,
): void {
  const messages = getSelectedMessages(turns, selectedItems);

  if (messages.length === 0) {
    throw new Error('No messages selected for export');
  }

  const csvContent = generateCsvContent(messages);
  const filename = `chat-export-${chatTitle ? sanitizeFilename(chatTitle) : 'untitled'}-${new Date().toISOString().slice(0, 10)}.csv`;

  downloadFile(csvContent, filename, 'text/csv');
}

/**
 * Export selected chat items to Markdown format
 */
export function exportToMarkdown(
  turns: ChatTurn[],
  selectedItems: SelectedChatItem[],
  chatTitle?: string,
  chatCreatedAt?: string,
): void {
  const messages = getSelectedMessages(turns, selectedItems);

  if (messages.length === 0) {
    throw new Error('No messages selected for export');
  }

  const markdownContent = generateMarkdownContent(
    messages,
    chatTitle,
    chatCreatedAt,
  );
  const filename = `chat-export-${chatTitle ? sanitizeFilename(chatTitle) : 'untitled'}-${new Date().toISOString().slice(0, 10)}.md`;

  downloadFile(markdownContent, filename, 'text/markdown');
}

/**
 * Get all messages that match the selected items
 */
const getSelectedMessages = (
  turns: ChatTurn[],
  selectedItems: SelectedChatItem[],
): ChatMessage[] => {
  const messages: ChatMessage[] = [];

  for (const item of selectedItems) {
    const turn = turns.find((t) => t.turnId === item.turnId);
    if (!turn) continue;

    if (item.type === 'turn') {
      // Add all messages from the turn
      messages.push(...turn.messages);
    } else if (item.type === 'message' && item.messageId !== undefined) {
      // Add specific message
      const message = turn.messages.find((m) => m.messageId === item.messageId);
      if (message) {
        messages.push(message);
      }
    }
  }

  // Sort by turn ID and message order for consistent output
  return messages.sort((a, b) => {
    if (a.turnId !== b.turnId) {
      return a.turnId - b.turnId;
    }
    return a.messageOrder - b.messageOrder;
  });
};

/**
 * Generate CSV content from messages
 */
const generateCsvContent = (messages: ChatMessage[]): string => {
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

/**
 * Generate Markdown content from messages
 */
const generateMarkdownContent = (
  messages: ChatMessage[],
  chatTitle?: string,
  chatCreatedAt?: string,
): string => {
  const lines: string[] = [];

  // Header
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

  // Group messages by turn for better structure
  const turnGroups = new Map<number, ChatMessage[]>();
  for (const message of messages) {
    if (!turnGroups.has(message.turnId)) {
      turnGroups.set(message.turnId, []);
    }
    turnGroups.get(message.turnId)!.push(message);
  }

  // Generate content for each turn
  for (const [turnId, turnMessages] of Array.from(turnGroups.entries()).sort(
    ([a], [b]) => a - b,
  )) {
    lines.push(`## Turn ${turnId}`);
    lines.push('');

    for (const message of turnMessages.sort(
      (a, b) => a.messageOrder - b.messageOrder,
    )) {
      // Message header
      let messageHeader = `**${capitalizeRole(message.role)}**`;
      if (message.toolName) {
        messageHeader += ` (Tool: ${message.toolName})`;
      }
      lines.push(messageHeader);
      lines.push('');

      // Message content
      if (message.content) {
        // Handle different content types
        if (typeof message.content === 'string') {
          lines.push(message.content);
        } else {
          lines.push('```json');
          lines.push(JSON.stringify(message.content, null, 2));
          lines.push('```');
        }
      } else {
        lines.push('*No content*');
      }

      lines.push('');
      lines.push('---');
      lines.push('');
    }
  }

  return lines.join('\n');
};

/**
 * Escape a field for CSV format
 */
const escapeCsvField = (field: string): string => {
  // If the field contains comma, newline, or quote, wrap in quotes and escape internal quotes
  if (field.includes(',') || field.includes('\n') || field.includes('"')) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
};

/**
 * Capitalize the first letter of a role
 */
const capitalizeRole = (role: string): string => {
  return role.charAt(0).toUpperCase() + role.slice(1);
};

/**
 * Sanitize filename by removing invalid characters
 */
const sanitizeFilename = (filename: string): string => {
  return filename.replace(/[<>:"/\\|?*]/g, '-').replace(/\s+/g, '-');
};

/**
 * Download a file with the given content
 */
const downloadFile = (
  content: string,
  filename: string,
  mimeType: string,
): void => {
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
