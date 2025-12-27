import { ZodObject, ZodArray, ZodOptional, ZodString, ZodNumber, ZodBoolean, ZodDefault, ZodNullable, ZodDate, } from 'zod';
const withComma = (input) => {
    const current = input.split('\n');
    if (!current.length) {
        return input;
    }
    const lastIndex = current.length - 1;
    const lastItem = current[lastIndex];
    let flagIndex = lastItem.indexOf('/* [optional');
    if (flagIndex === -1) {
        flagIndex = lastItem.indexOf('/* [nullable');
    }
    let descriptionCommentIndex = lastItem.lastIndexOf('/*');
    if (descriptionCommentIndex === flagIndex) {
        descriptionCommentIndex = -1;
    }
    current[lastIndex] =
        descriptionCommentIndex > -1
            ? `${lastItem.slice(0, descriptionCommentIndex - 1)},${lastItem.slice(descriptionCommentIndex - 1)}`
            : lastItem + ',';
    return current.join('\n');
};
const zodToSchemaField = (schema) => {
    let ret = { description: schema.description };
    const unwrapType = () => {
        if ('schema' in schema._def) {
            return zodToSchemaField(schema._def.schema);
        }
        if ('unwrap' in schema &&
            schema.unwrap &&
            typeof schema.unwrap === 'function') {
            return zodToSchemaField(schema.unwrap());
        }
        return zodToSchemaField(schema._def.innerType);
    };
    if (schema instanceof ZodOptional || schema instanceof ZodDefault) {
        ret = unwrapType();
        ret.optional = true;
    }
    else if (schema instanceof ZodNullable) {
        ret = unwrapType();
        ret.nullable = true;
    }
    else if (schema instanceof ZodString) {
        ret.type = 'string';
    }
    else if (schema instanceof ZodNumber) {
        ret.type = 'number';
    }
    else if (schema instanceof ZodBoolean) {
        ret.type = 'boolean';
    }
    else if (schema instanceof ZodDate) {
        ret.type = 'date';
    }
    else if (schema instanceof ZodArray) {
        ret.type = 'array';
        if (ret.type === 'array') {
            ret.items = zodToSchemaField(schema.element);
        }
    }
    else if (schema instanceof ZodObject) {
        ret.type = 'object';
        if (ret.type === 'object') {
            const shape = schema.shape;
            ret.properties = {};
            for (const key in shape) {
                ret.properties[key] = zodToSchemaField(shape[key]);
            }
        }
    }
    else {
        ret.type = 'any';
    }
    ret.toString = (indent = 0) => {
        let builder = '';
        switch (ret.type) {
            case 'array':
                builder = `[ ${ret.items ? withComma(ret.items.toString(indent + 1)) : withComma('unknown')} ... ] as Array<${ret.items?.type ?? 'any'}>`;
                break;
            case 'object':
                const indentStr = ' '.repeat((indent + 1) * 2);
                builder =
                    '{' +
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
        }
        else if (ret.nullable) {
            builder = `/* [nullable] */ ${builder}`;
        }
        if (ret.description) {
            builder = `${builder} /* ${ret.description} */`;
        }
        return builder;
    };
    return ret;
};
export const zodToStructure = (schema) => {
    const asField = zodToSchemaField(schema);
    return asField.toString();
};
