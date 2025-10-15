import { setupImpersonationMock } from '@/__tests__/jest.mock-impersonation';

setupImpersonationMock();

 
import { clientToolProviderFactory } from '@/lib/ai/mcp/providers';

describe('clientToolProviderFactory', () => {
  let provider: ReturnType<typeof clientToolProviderFactory>;

  beforeEach(() => {
    provider = clientToolProviderFactory();
  });

  it('should return a provider with the correct tools', () => {
    const tools = provider.tools;

    expect(tools).toHaveProperty('askConfirmation');
    expect(tools).toHaveProperty('openCaseFile');
  });

  describe('askConfirmation tool', () => {
    it('should have the correct description and parameters schema', () => {
      const tool = provider.tools.askConfirmation;

      expect(tool.description).toBe(
        'Ask the user for confirmation before proceeding.  Returns an empty string if the user rejects the request, otherwise a confirmation hash.',
      );

      const schema = tool.inputSchema as any;
      expect(() => {
        schema.parse({ question: 'Are you sure?' });
      }).not.toThrow();

      expect(() => {
        (schema as any).parse({
          question: 'Are you sure?',
          options: ['Yes', 'No'],
        });
      }).not.toThrow();

      expect(() => {
        (schema as any).parse({});
      }).toThrow();
    });
  });

  describe('openCaseFile tool', () => {
    it('should have the correct description and parameters schema', () => {
      const tool = provider.tools.openCaseFile;

      expect(tool.description).toBe(
        "Opens a case file on the user's desktop.  This tool is useful when a ",
      );

      const schema = tool.inputSchema as any;
      expect(() => {
        schema.parse({ caseId: '12345' });
      }).not.toThrow();

      expect(() => {
        schema.parse({ caseId: '12345', page: 'email' });
      }).not.toThrow();

      expect(() => {
        schema.parse({ caseId: '12345', confirmation: 'hash123' });
      }).not.toThrow();

      expect(() => {
        (schema as any).parse({});
      }).toThrow();
    });
  });

  it('should return a connected provider', async () => {
    const connectedProvider = await provider.connect({});
    expect(connectedProvider.get_isConnected()).toBe(true);
  });

  it('should dispose without errors', async () => {
    await expect(provider.dispose()).resolves.toBeUndefined();
  });
});
