import { isKeyOf } from '@compliance-theater/typescript';
export class EmailHeaderParser {
    #parser;
    #split;
    constructor(splitArrays, parse) {
        this.#parser = parse
            ? (x) => {
                const match = x.match(/\s*(?:([^<]+)\s+)<([^>]+)>/);
                return match
                    ? { name: match[1].replaceAll('"', ''), email: match[2].trim() }
                    : { email: x.trim() };
            }
            : (x) => x;
        this.#split = splitArrays ? ',' : undefined;
    }
    get split() {
        return this.#split;
    }
    get parse() {
        return this.#parser;
    }
}
export class BracketHeaderParser {
    #parser;
    #split;
    constructor(splitArrays, parse) {
        this.#parser = parse
            ? (x) => {
                const match = x.match(/<([^>]+)>/);
                return match ? match[1] : x;
            }
            : (x) => x;
        this.#split = splitArrays ? ' ' : undefined;
    }
    get split() {
        return this.#split;
    }
    get parse() {
        return this.#parser;
    }
}
export class ParsedHeaderMap extends Map {
    static makeParseMap = ({ expandArrays = false, parseContacts = false, extractBrackets = false, } = {}) => {
        const ret = {
            to: new EmailHeaderParser(expandArrays, parseContacts),
            cc: new EmailHeaderParser(expandArrays, parseContacts),
            bcc: new EmailHeaderParser(expandArrays, parseContacts),
            from: new EmailHeaderParser(expandArrays, parseContacts),
            'return-path': new BracketHeaderParser(expandArrays, extractBrackets),
            'message-id': new BracketHeaderParser(expandArrays, extractBrackets),
            'in-reply-to': new BracketHeaderParser(expandArrays, extractBrackets),
            references: new BracketHeaderParser(expandArrays, extractBrackets),
            get: (key) => {
                const normalKey = key.toLocaleLowerCase();
                if (isKeyOf(normalKey, ret)) {
                    if (normalKey === 'get')
                        return undefined;
                    return ret[normalKey];
                }
            },
        };
        return ret;
    };
    static headerContactToString = (contact) => contact.name ?? contact.email;
    static valueAsString = (value) => typeof value === 'string'
        ? value
        : ParsedHeaderMap.headerContactToString(value);
    static valueAsContact = (contact) => typeof contact === 'string' ? { email: contact } : contact;
    static fromHeaders(headers, options) {
        const parseOptionMap = ParsedHeaderMap.makeParseMap(options);
        const map = new ParsedHeaderMap();
        for (const header of headers ?? []) {
            if (header.name && header.value) {
                if (map.has(header.name)) {
                    let value = header.value;
                    const parser = parseOptionMap.get(header.name);
                    if (parser) {
                        if (parser.split) {
                            value = value.split(parser.split).map(parser.parse ?? ((x) => x));
                        }
                        else if (parser.parse) {
                            value = parser.parse(value);
                        }
                    }
                    if (Array.isArray(value)) {
                        const existing = map.get(header.name);
                        if (existing) {
                            if (Array.isArray(existing)) {
                                existing.push(...value);
                            }
                            else {
                                map.set(header.name, [existing, ...value]);
                            }
                        }
                    }
                    else {
                        const existing = map.get(header.name);
                        if (Array.isArray(existing)) {
                            existing.push(value);
                        }
                        else if (existing) {
                            map.set(header.name, [existing, value]);
                        }
                        else {
                            map.set(header.name, value);
                        }
                    }
                }
                else {
                    let value = header.value;
                    const parser = parseOptionMap.get(header.name);
                    if (parser) {
                        if (parser.split) {
                            value = value.split(parser.split).map(parser.parse ?? ((x) => x));
                        }
                        else if (parser.parse) {
                            value = parser.parse(value);
                        }
                    }
                    map.set(header.name, value);
                }
            }
        }
        return map;
    }
    getFirstValue(key) {
        const value = this.get(key);
        if (Array.isArray(value)) {
            return value[0];
        }
        return value;
    }
    getFirstStringValue(key) {
        const value = this.getFirstValue(key);
        return value ? ParsedHeaderMap.valueAsString(value) : undefined;
    }
    getFirstContactValue(key) {
        const value = this.getFirstValue(key);
        return value ? ParsedHeaderMap.valueAsContact(value) : undefined;
    }
    getFirstValueOrDefault(key, defaultValue) {
        return this.getFirstStringValue(key) ?? defaultValue;
    }
    getAllValues(key) {
        const value = this.get(key);
        return Array.isArray(value) ? value : value ? [value] : [];
    }
    getAllStringValues(key) {
        const value = this.getAllValues(key);
        return value.map(ParsedHeaderMap.valueAsString);
    }
    getAllContactValues(key) {
        const value = this.getAllValues(key);
        return value.map(ParsedHeaderMap.valueAsContact);
    }
    hasValue(key, value) {
        const values = this.getAllValues(key);
        return values.includes(value);
    }
    countValues(key) {
        return this.getAllValues(key).length;
    }
    clearValues(key) {
        this.delete(key);
    }
    clearAllValues() {
        this.clear();
    }
}
export const isParsedHeaderMap = (value) => value instanceof ParsedHeaderMap;
//# sourceMappingURL=parsedHeaderMap.js.map