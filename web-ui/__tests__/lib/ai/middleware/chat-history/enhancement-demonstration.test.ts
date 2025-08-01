/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * @fileoverview Demonstration test showing the chat history enhancement in action
 * 
 * This test demonstrates the key improvement: the middleware now only saves
 * new messages that weren't included in previous conversation turns.
 */

import { getNewMessages } from '@/lib/ai/middleware/chat-history/utility';
import { LanguageModelV1MessageExt } from '@/lib/ai/types';

// Mock database schema
jest.mock('@/lib/drizzle-db', () => ({
  schema: {
    chatMessages: {
      role: 'mocked-role-column',
      content: 'mocked-content-column', 
      messageOrder: 'mocked-order-column',
      chatId: 'mocked-chatid-column',
    }
  }
}));

describe('Chat History Enhancement Demonstration', () => {
  let mockTx: any;

  beforeEach(() => {
    mockTx = {
      select: jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            orderBy: jest.fn().mockReturnValue([]), // Will be set by individual tests
          }),
        }),
      }),
    };
  });

  it('demonstrates the enhancement: only new messages are saved', async () => {
    /**
     * SCENARIO: Multi-turn conversation where previous messages are repeated
     * 
     * Turn 1: User says "Hello", Assistant responds "Hi there!"
     * Turn 2: User continues with conversation history + new message
     * 
     * BEFORE enhancement: All 3 messages would be saved again (duplicates)
     * AFTER enhancement: Only the 1 new message is saved
     */
    
    // Simulate existing messages from Turn 1
    const existingMessages = [
      { role: 'user', content: [ { type: 'text', text: 'Hello' } ], messageOrder: 0 },
      { role: 'assistant', content: [ { type: 'text', text: 'Hi there!' } ], messageOrder: 1 }
    ];

    // Simulate Turn 2 incoming messages (conversation history + new message)
    const turn2Messages: LanguageModelV1MessageExt = [
      { role: 'user', content: [ { type: 'text', text: 'Hello' } ]},           // DUPLICATE from Turn 1
      { role: 'assistant', content: [ { type: 'text', text: 'Hello' } ] },  // DUPLICATE from Turn 1  
      { role: 'user', content: [ { type: 'text', text: 'Hello' } ] } // NEW message
    ];

    // Mock database to return existing messages
    mockTx.select().from().where().orderBy.mockResolvedValue(existingMessages);

    // Act - Filter messages using the enhancement
    const newMessages:any = await getNewMessages(mockTx, 'chat-123', turn2Messages);

    // Assert - Only the truly new message should be returned
    expect(newMessages).toHaveLength(1);
    expect(newMessages[0]).toEqual({
      role: 'user',
      content: [ { type: 'text', text: 'How can you help me?' } ]
    });
  });

  it('shows the enhancement gracefully handles empty and new chats', async () => {
    // Scenario: Brand new chat with no existing messages
    const newChatMessages: LanguageModelV1MessageExt = [
      { role: 'user', content: [ { type: 'text', text: 'First message ever' } ] },
      { role: 'assistant', content: [ { type: 'text',  text: 'Welcome! How can I help?' } ] }
    ];

    // Mock empty chat (no existing messages)
    mockTx.select().from().where().orderBy.mockResolvedValue([]);

    // Act
    const newMessages = await getNewMessages(mockTx, 'new-chat-456', newChatMessages);

    // Assert - All messages should be considered new
    expect(newMessages).toHaveLength(2);
    expect(newMessages).toEqual(newChatMessages);

  });

  it('validates the enhancement is content and role aware', async () => {
    // Scenario: Similar content but different roles or slight variations
    const existingMessages = [
      { role: 'user', content: 'Hello world', messageOrder: 0 }
    ];

    const mixedMessages:LanguageModelV1MessageExt = [
      { role: 'user', content: [{type: 'text', text: 'Hello world' }]},      // EXACT duplicate
      { role: 'assistant', content: [{type: 'text', text: 'Hello world' }]}, // Same content, different role - NEW
      { role: 'user', content: [{type: 'text', text: 'Hello World' }]},      // Case difference - NEW
      { role: 'user', content: [{type: 'text', text: 'Hello world!' }]},      // Punctuation difference - NEW
    ];

    mockTx.select().from().where().orderBy.mockResolvedValue(existingMessages);
    // Act  
    const newMessages = await getNewMessages(mockTx, 'chat-789', mixedMessages);

    // Assert - Only exact matches are filtered out
    expect(newMessages).toHaveLength(3);
    expect(newMessages.map(m => `${m.role}:${m.content}`)).toEqual([
      'assistant:Hello world',
      'user:Hello World', 
      'user:Hello world!'
    ]);

  });
});
