import * as aiIndex from '../../../src/components/ai';
import * as chatPanelIndex from '../../../src/components/ai/chat-panel';

describe('components/ai exports', () => {
    it('re-exports the same runtime symbols from ai and chat-panel indexes', () => {
        expect(aiIndex.ChatPanelContext).toBe(chatPanelIndex.ChatPanelContext);
        expect(aiIndex.useChatPanelContext).toBe(chatPanelIndex.useChatPanelContext);
    });
});