import {
    getRetryErrorInfoKind,
    isChatDetails,
    isChatMessage,
    isChatTurn,
} from '../../../src/lib/ai/chat';

describe('lib/ai/chat runtime guards', () => {
    const validMessage = {
        id: 'msg-1',
        turnId: 1,
        role: 'user',
        content: 'hello',
        createdAt: '2026-02-28T12:00:00.000Z',
        metadata: { source: 'test' },
    };

    const validTurn = {
        turnId: 1,
        createdAt: '2026-02-28T12:00:00.000Z',
        completedAt: null,
        modelName: 'hifi',
        messages: [validMessage],
        statusId: 1,
        temperature: 0.2,
        topP: 0.9,
        latencyMs: 123,
        warnings: null,
        errors: null,
        metadata: { tokens: 11 },
    };

    const validChatDetails = {
        id: 'chat-1',
        title: 'Title',
        createdAt: '2026-02-28T12:00:00.000Z',
        turns: [validTurn],
    };

    it('validates ChatMessage structures', () => {
        expect(isChatMessage(validMessage)).toBe(true);

        expect(isChatMessage(null)).toBe(false);
        expect(isChatMessage({ ...validMessage, id: 1 })).toBe(false);
        expect(isChatMessage({ ...validMessage, turnId: '1' })).toBe(false);
        expect(isChatMessage({ ...validMessage, role: 7 })).toBe(false);
        expect(isChatMessage({ ...validMessage, content: null })).toBe(false);
        expect(isChatMessage({ ...validMessage, createdAt: 123 })).toBe(false);
        expect(isChatMessage({ ...validMessage, name: 1 })).toBe(false);
        expect(isChatMessage({ ...validMessage, metadata: 'bad' })).toBe(false);
    });

    it('validates ChatTurn structures', () => {
        expect(isChatTurn(validTurn)).toBe(true);

        expect(isChatTurn({ ...validTurn, completedAt: 1 })).toBe(false);
        expect(isChatTurn({ ...validTurn, modelName: 1 })).toBe(false);
        expect(isChatTurn({ ...validTurn, messages: 'bad' })).toBe(false);
        expect(isChatTurn({ ...validTurn, messages: [{ ...validMessage, id: 123 }] })).toBe(false);
        expect(isChatTurn({ ...validTurn, statusId: '1' })).toBe(false);
        expect(isChatTurn({ ...validTurn, temperature: '0.2' })).toBe(false);
        expect(isChatTurn({ ...validTurn, topP: '0.9' })).toBe(false);
        expect(isChatTurn({ ...validTurn, latencyMs: '123' })).toBe(false);
        expect(isChatTurn({ ...validTurn, warnings: [1] })).toBe(false);
        expect(isChatTurn({ ...validTurn, errors: [1] })).toBe(false);
        expect(isChatTurn({ ...validTurn, metadata: 'bad' })).toBe(false);
    });

    it('validates ChatDetails structures', () => {
        expect(isChatDetails(validChatDetails)).toBe(true);

        expect(isChatDetails({ ...validChatDetails, id: 1 })).toBe(false);
        expect(isChatDetails({ ...validChatDetails, title: 1 })).toBe(false);
        expect(isChatDetails({ ...validChatDetails, createdAt: 1 })).toBe(false);
        expect(isChatDetails({ ...validChatDetails, turns: {} })).toBe(false);
        expect(isChatDetails({ ...validChatDetails, turns: [{ ...validTurn, statusId: 'bad' }] })).toBe(false);
    });

    it('classifies retry error info kinds', () => {
        expect(
            getRetryErrorInfoKind({ isError: false, isRetry: undefined as never })
        ).toBe('none');

        expect(
            getRetryErrorInfoKind({
                isError: true,
                isRetry: true,
                error: new Error('retry'),
                retryAfter: 100,
            })
        ).toBe('retryable');

        expect(
            getRetryErrorInfoKind({
                isError: true,
                isRetry: false,
                error: new Error('no retry'),
            })
        ).toBe('nonRetryable');

        expect(
            getRetryErrorInfoKind({
                isError: true,
                isRetry: undefined,
                error: new Error('generic'),
            })
        ).toBe('generic');
    });
});