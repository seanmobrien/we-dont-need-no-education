import { StopConditionLibrary } from "@/lib/ai/middleware/stop-conditions";
describe('StopConditionLibrary', () => {
    describe('noToolsPending', () => {
        const library = new StopConditionLibrary();
        const { noToolsPending } = library;
        it('should return false if there are no steps', () => {
            const result = noToolsPending({ messages: [], steps: [] });
            expect(result).toBe(false);
        });
        it('should return false if finishReason is "tool-calls"', () => {
            const steps = [
                { finishReason: 'tool-calls' }
            ];
            const result = noToolsPending({ messages: [], steps });
            expect(result).toBe(false);
        });
        it('should return false if finishReason is "length"', () => {
            const steps = [
                { finishReason: 'length' }
            ];
            const result = noToolsPending({ messages: [], steps });
            expect(result).toBe(false);
        });
        it('should return false if finishReason is "content-filter"', () => {
            const steps = [
                { finishReason: 'content-filter' }
            ];
            const result = noToolsPending({ messages: [], steps });
            expect(result).toBe(false);
        });
        it('should return true if finishReason is "stop"', () => {
            const steps = [
                { finishReason: 'stop' }
            ];
            const result = noToolsPending({ messages: [], steps });
            expect(result).toBe(true);
        });
        it('should correct check the LAST step', () => {
            const steps = [
                { finishReason: 'tool-calls' },
                { finishReason: 'stop' }
            ];
            const result = noToolsPending({ messages: [], steps });
            expect(result).toBe(true);
        });
        it('should correct check the LAST step (negative case)', () => {
            const steps = [
                { finishReason: 'stop' },
                { finishReason: 'tool-calls' }
            ];
            const result = noToolsPending({ messages: [], steps });
            expect(result).toBe(false);
        });
    });
});
//# sourceMappingURL=stop-conditions.test.js.map