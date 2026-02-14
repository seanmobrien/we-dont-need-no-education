const transformParams = async ({ params }) => {
    if (!Array.isArray(params.prompt)) {
        params.prompt = [params.prompt];
    }
    const insertIndex = params.prompt.findLastIndex(m => m.role === 'assistant');
    const memoryPrompt = {
        role: 'system',
        content: 'You are a helpful assistant equipped with an advanced memory module that enables you to remember past interactions.' +
            ' Your memory is designed to assist you in providing more relevant and personalized responses based on previous conversations.' +
            ' Before generating a response, you will use the `search_memory` tool to search your memory for relevant past interactions.' +
            ' If you find relevant memories, you will incorporate them into your response.' +
            ' If no relevant memories are found, you will respond based solely on the current prompt.' +
            ' After generating a response, you will provide the `add_memories` tool with all details needed to update your memory with ' +
            'information from the new interaction.'
    };
    if (insertIndex === -1) {
        params.prompt = [
            memoryPrompt,
            ...params.prompt,
        ];
    }
    else {
        params.prompt.splice(insertIndex + 1, 0, memoryPrompt);
    }
    return params;
};
const onOutputGenerated = () => Promise.resolve(true);
export const promptInjectionStrategyFactory = () => ({
    transformParams,
    onOutputGenerated,
});
//# sourceMappingURL=prompt-injection-strategy.js.map