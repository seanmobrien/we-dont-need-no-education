import { log } from '@compliance-theater/logger';
import { isParsedHeaderMap } from '../../parsedHeaderMap';
export const mapContacts = (headers, recipientHeaderNames) => {
    const headersToMatch = recipientHeaderNames ?? ['To', 'Cc', 'Bcc', 'From'];
    if (isParsedHeaderMap(headers)) {
        const workingHeaders = headers;
        return headersToMatch
            .flatMap((headerName) => workingHeaders.getAllValues(headerName).flatMap((v) => mapContact({
            value: typeof v === 'string' ? v : `${v.name ?? ''} <${v.email}>`,
        }, headerName.toLocaleLowerCase())))
            .filter((x) => !!x);
    }
    return (headers
        ?.flatMap((header) => {
        if (!headersToMatch.includes(header.name ?? 'never-match')) {
            return null;
        }
        return mapContact(header, header.name?.toLocaleLowerCase());
    })
        ?.filter((x) => !!x) ?? []);
};
export const mapContact = (source, recipientType) => {
    if (typeof source === 'object') {
        return (source?.value ?? '')
            .split(/[,;]\s+?/)
            .map((v) => mapContact(v, recipientType))
            .filter(Boolean);
    }
    if (typeof source !== 'string') {
        return null;
    }
    const matches = /^"?(.*)"?(?=\s<)\s<([^>]+)/g.exec(source ?? '');
    if (!matches) {
        log((l) => l.warn({
            message: `No valid contacts found in header.`,
            header: { value: source },
        }));
        return null;
    }
    return {
        fullName: matches[1],
        firstName: matches[1].split(' ')[0],
        lastName: matches[1]
            .split(' ')
            .filter((_, i) => i > 0)
            .join(' '),
        email: matches[2],
        recipientType,
    };
};
//# sourceMappingURL=utilities.js.map