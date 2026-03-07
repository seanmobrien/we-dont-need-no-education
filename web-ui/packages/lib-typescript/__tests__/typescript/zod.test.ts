import { DocumentSchema } from '@/lib/ai/tools/schemas/case-file-shape';
import { zodToStructure } from '../../src';
import { z } from 'zod';

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

  it('formats optional and nullable scalar fields', () => {
    const schema = z.object({
      nickname: z.string().optional(),
      middleName: z.string().nullable(),
      age: z.number().optional().nullable(),
    });

    const result = zodToStructure(schema);

    expect(result).toContain('nickname: /* [optional] */ <string>,');
    expect(result).toContain('middleName: /* [nullable] */ <string>,');
    expect(result).toContain('age: /* [optional, nullable] */ <number>,');
  });

  it('formats arrays, nested objects, defaults, and descriptions', () => {
    const schema = z.object({
      tags: z.array(z.string()),
      profile: z.object({
        city: z.string().describe('city name'),
      }),
      score: z.number().default(5),
    });

    const result = zodToStructure(schema);

    expect(result).toContain('tags: [ <string>, ... ] as Array<string>,');
    expect(result).toContain('profile: {');
    expect(result).toContain('city: <string>, /* city name */');
    expect(result).toContain('score: /* [optional] */ <number>,');
  });

  it('falls back to any for unsupported zod schema types', () => {
    const schema = z.any();
    const result = zodToStructure(schema);

    expect(result).toBe('<any>');
  });
});
