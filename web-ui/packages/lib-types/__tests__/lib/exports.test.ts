import * as libAi from '../../src/lib/ai';
import * as libAiIndex from '../../src/lib/ai/index';
import * as libNextjs from '../../src/lib/nextjs';
import * as libNextjsIndex from '../../src/lib/nextjs/index';
import * as libAiChat from '../../src/lib/ai/chat';
import * as libAiChatIndex from '../../src/lib/ai/chat/index';
import * as libAiCore from '../../src/lib/ai/core';
import * as libAiCoreIndex from '../../src/lib/ai/core/index';

describe('lib barrel exports', () => {
    it('re-exports ai index through lib/ai.ts', () => {
        expect(libAi.isAiModelType).toBe(libAiIndex.isAiModelType);
        expect(libAi.isAiProviderType).toBe(libAiIndex.isAiProviderType);
        expect(libAi.getRetryErrorInfoKind).toBe(libAiIndex.getRetryErrorInfoKind);
    });

    it('re-exports nextjs index through lib/nextjs.ts', () => {
        expect(libNextjs.cryptoRandomBytes).toBe(libNextjsIndex.cryptoRandomBytes);
        expect(libNextjs.isRequestOrApiRequest).toBe(libNextjsIndex.isRequestOrApiRequest);
        expect(libNextjs.isNextResponse).toBe(libNextjsIndex.isNextResponse);
    });

    it('re-exports ai/chat index through lib/ai/chat.ts', () => {
        expect(libAiChat.isChatMessage).toBe(libAiChatIndex.isChatMessage);
        expect(libAiChat.isChatTurn).toBe(libAiChatIndex.isChatTurn);
        expect(libAiChat.isChatDetails).toBe(libAiChatIndex.isChatDetails);
    });

    it('re-exports ai/core index through lib/ai/core.ts', () => {
        expect(libAiCore.isAiLanguageModelType).toBe(libAiCoreIndex.isAiLanguageModelType);
        expect(libAiCore.isAiProviderType).toBe(libAiCoreIndex.isAiProviderType);
        expect(libAiCore.isAiModelType).toBe(libAiCoreIndex.isAiModelType);
    });
});