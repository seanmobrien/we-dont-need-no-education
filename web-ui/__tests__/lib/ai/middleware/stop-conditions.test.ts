
import { StopConditionLibrary } from "@/lib/ai/middleware/stop-conditions";

describe('StopConditionLibrary', () => {
  describe('noToolsPending', () => {
    const library = new StopConditionLibrary();
    const { noToolsPending } = library;

    it('should return false if there are no steps', () => {
      const result = noToolsPending({ messages: [], steps: [] } as any);
      expect(result).toBe(false);
    });

    it('should return false if finishReason is "tool-calls"', () => {
      const steps: any[] = [
        { finishReason: 'tool-calls' }
      ];
      const result = noToolsPending({ messages: [], steps } as any);
      expect(result).toBe(false);
    });

    it('should return false if finishReason is "length"', () => {
      const steps: any[] = [
        { finishReason: 'length' }
      ];
      const result = noToolsPending({ messages: [], steps } as any);
      expect(result).toBe(false);
    });

    it('should return false if finishReason is "content-filter"', () => {
      const steps: any[] = [
        { finishReason: 'content-filter' }
      ];
      const result = noToolsPending({ messages: [], steps } as any);
      expect(result).toBe(false);
    });

    it('should return true if finishReason is "stop"', () => {
      const steps: any[] = [
        { finishReason: 'stop' }
      ];
      const result = noToolsPending({ messages: [], steps } as any);
      expect(result).toBe(true);
    });

    it('should correct check the LAST step', () => {
      const steps: any[] = [
        { finishReason: 'tool-calls' },
        { finishReason: 'stop' }
      ];
      const result = noToolsPending({ messages: [], steps } as any);
      expect(result).toBe(true);
    });

    it('should correct check the LAST step (negative case)', () => {
      const steps: any[] = [
        { finishReason: 'stop' },
        { finishReason: 'tool-calls' }
      ];
      const result = noToolsPending({ messages: [], steps } as any);
      expect(result).toBe(false);
    });
  });
});
