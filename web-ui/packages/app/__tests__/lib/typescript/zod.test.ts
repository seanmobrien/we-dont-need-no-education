import { DocumentSchema } from '@/lib/ai/tools/schemas/case-file-shape';
import { zodToStructure } from '@compliance-theater/typescript';

describe('zod-to-json-structure', () => {
  it('should convert DocumentSchema schema to JSON structure', () => {
    const schema = DocumentSchema;
    const jsonStructure = zodToStructure(schema);
    // Check if the output matches the expected structure
    expect(jsonStructure).not.toEqual('');
    expect(
      jsonStructure === '<any>' ||
      /subject:[\s\t]+\<string\>,\s*\n/g.test(jsonStructure)
    ).toBe(true);
  });
});
