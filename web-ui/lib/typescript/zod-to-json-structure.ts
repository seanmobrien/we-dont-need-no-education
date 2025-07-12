/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  ZodTypeAny,
  ZodObject,
  ZodArray,
  ZodOptional,
  ZodString,
  ZodNumber,
  ZodBoolean,
  ZodEffects,
  ZodDefault,
} from 'zod';

// Recursively walk the schema
export function zodToStructure(schema: ZodTypeAny): any {
  // Handle effects/unwrapping
  if (
    schema instanceof ZodEffects ||
    schema instanceof ZodDefault ||
    schema instanceof ZodOptional
  ) {
    return zodToStructure('schema' in schema._def ? schema._def.schema : {});
  }

  if (schema instanceof ZodObject) {
    const shape = schema.shape;
    const out: any = {};

    for (const key in shape) {
      const field = shape[key];
      const def = field._def;
      const description = def.description ? ` // ${def.description}` : '';
      const value = zodToStructure(field);
      out[`${key}${description}`] = value;
    }

    return out;
  }

  if (schema instanceof ZodArray) {
    return [zodToStructure(schema.element)];
  }

  if (schema instanceof ZodString) return '<string>';
  if (schema instanceof ZodNumber) return 0;
  if (schema instanceof ZodBoolean) return true;

  return '<any>';
}
