import { DocumentSchema } from '/lib/ai/tools/schemas/case-file-shape';
import { zodToStructure } from '/lib/typescript';

describe('zod-to-json-structure', () => {
  it('should convert DocumentSchema schema to JSON structure', () => {
    const schema = DocumentSchema;
    const jsonStructure = zodToStructure(schema);
    // Check if the output matches the expected structure
    expect(jsonStructure).not.toEqual('');
    expect(jsonStructure).toMatch(/subject:[\s\t]+\<string\>,\s*\n/g);
    expect(jsonStructure).toMatch(
      /unitId:\s*\/\*\s*\[optional,\s*nullable\]\s*\*\/\s*<number>,/g,
    );
  });
});
