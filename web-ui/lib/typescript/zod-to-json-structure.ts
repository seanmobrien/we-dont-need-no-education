/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  ZodTypeAny,
  ZodObject,
  ZodArray,
  ZodOptional,
  ZodString,
  ZodNumber,
  ZodBoolean,
  ZodDefault,
  ZodNullable,
  ZodDate,
} from 'zod';



/*
type WrappedNullableType<T extends ZodTypeAny> = T extends ZodNullable<infer U>
  ? ZodNullable<U>
  : T extends ZodEffects<infer U>
  ? ZodEffects<U>
  : T extends ZodString
  ? ZodString
  : T extends ZodNumber
  ? ZodNumber
  : T extends ZodDate
  ? ZodDate
  : T extends ZodBoolean
  ? ZodBoolean
  : T extends ZodObject<any>
  ? ZodObject<any>
  : T extends ZodArray<infer U>
  ? ZodArray<U>
  : T extends ZodOptional<infer U>
  ? ZodOptional<U>
  : T extends ZodDefault<infer U>
  ? ZodDefault<U>  
  : ZodTypeAny;
*/
const stampIsOptional = ({schema, input}: {schema: ZodTypeAny; input: string}): string => {  
  if (    
    schema instanceof ZodDefault ||
    schema instanceof ZodOptional ||
    schema instanceof ZodNullable
  ) {
    const stamp = "[optional]";
    const commentsAt = input.indexOf('//');
    if (commentsAt === -1)
    {
      return `${input ?? ""} // ${stamp}`;
    }
    return `${input.slice(0, commentsAt)} // ${stamp}: ${input.slice(commentsAt + 2)}`;
  }
  return input;
};

interface SchemaFieldToString {
  (): string;
  (indent: number): string;
}

type BasedSchemaField = {
  type: string;
  optional?: boolean;
  nullable?: boolean;
  description?: string;
  toString: SchemaFieldToString;
};

type SchemaField =
  | (BasedSchemaField & {
      type: 'array';
      items: Exclude<SchemaField, 'optional'>;
    })
  | (BasedSchemaField & {
      type: 'object';
      properties: Record<string, SchemaField>;
    })
  | (BasedSchemaField & {
      type: 'number' | 'boolean' | 'date';
      nullable: false | never;
    })
  | (BasedSchemaField & {
      type: 'string';
    })
  | (BasedSchemaField & {
      properties?: Record<string, SchemaField>;
      items?: Exclude<SchemaField, 'optional'>;
      type: 'any';
    });


const withComma = (input: string): string => {
  const current = input.split('\n');
  if (!current.length) { return input; }
  const lastIndex = current.length - 1;  
  const lastItem = current[lastIndex];
  let flagIndex = lastItem.indexOf('/* [optional');
  if (flagIndex === -1) {
    flagIndex = lastItem.indexOf('/* [nullable');
  }
  let descriptionCommentIndex = lastItem.lastIndexOf('/*');
  if (descriptionCommentIndex === flagIndex) {
    descriptionCommentIndex = -1
  }
  current[lastIndex] =
    descriptionCommentIndex > -1
      ? `${lastItem.slice(0, descriptionCommentIndex - 1)},${lastItem.slice(descriptionCommentIndex - 1)}`
      : lastItem + ',';
  return current.join('\n');
}
const zodToSchemaField = (schema: ZodTypeAny): SchemaField => {
  let ret: Partial<SchemaField> = { description: schema.description };  
  const unwrapType = () => {
    // Handle effects/unwrapping
    if ('schema' in schema._def) {      
      return zodToSchemaField(schema._def.schema);      
    }
    if ('unwrap' in schema && schema.unwrap && typeof schema.unwrap === 'function') {
      return zodToSchemaField(schema.unwrap());
    }
    return zodToSchemaField(schema._def.innerType);
  };
  if (schema instanceof ZodOptional) {
    ret = unwrapType();
    ret.optional = true;
  } else if (schema instanceof ZodNullable) {
    ret = unwrapType();
    ret.nullable = true;
  } else if (schema instanceof ZodString) {
    ret.type = 'string';
  } else if (schema instanceof ZodNumber) {
    ret.type = 'number';
  } else if (schema instanceof ZodBoolean) {
    ret.type = 'boolean';
  } else if (schema instanceof ZodDate) {
    ret.type = 'date';
  } else if (schema instanceof ZodArray) {
    ret.type = 'array';
    if (ret.type === 'array') {
      ret.items = zodToSchemaField(schema.element);
    }
  } else if (schema instanceof ZodObject) {
    ret.type = 'object';
    if (ret.type === 'object') {
      const shape = schema.shape as Record<string, ZodTypeAny>;
      ret.properties = {};
      for (const key in shape) {
        ret.properties[key] = zodToSchemaField(shape[key]);
      }
    }
  } else {
    ret.type = 'any';
  }
  ret.toString = (indent: number = 0) => {
    let builder = '';
    switch (ret.type) {
      case 'array':
        builder = `[ ${ret.items ? withComma(ret.items.toString(indent + 1)) : withComma('unknown')} ... ] as Array<${ret.items?.type ?? 'any'}>`;
        break;
      case 'object':
        const indentStr = ' '.repeat((indent + 1) * 2);
        builder = '{' +
          Object.entries(ret.properties ?? {})
            .map(([key, value]) => withComma(`\n${indentStr}${key}: ${value.toString(indent + 1)}`))
            .join('') +
            `\n${' '.repeat(indent * 2)}}`;          
        break;
      case undefined:
        builder = '<any>';
        break;
      default:
        builder = `<${ret.type}>`;
        break;
    }
    if (ret.optional) {
      builder = `/* [optional${ret.nullable ? ', nullable' : ''}] */ ${builder}`;
    } else if (ret.nullable) {
      builder = `/* [nullable] */ ${builder}`;
    }
    if (ret.description) {
      builder = `${builder} /* ${ret.description} */`;
    }
    return builder;
  };
  return ret as SchemaField;
};

// Recursively walk the schema
export const zodToStructure = (schema: ZodTypeAny): string => {
  const asField = zodToSchemaField(schema);
  return asField.toString();
};