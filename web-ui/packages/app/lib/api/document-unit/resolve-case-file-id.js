import { drizDbWithInit } from '@compliance-theater/database/orm';
import { LoggedError } from '@compliance-theater/logger';
import { isValidUuid, } from '@compliance-theater/typescript';
export const resolveCaseFileId = async (documentId) => {
    if (!documentId) {
        return undefined;
    }
    let parsedId;
    if (typeof documentId === 'string') {
        const uuidFormatRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
        const isValidFormat = uuidFormatRegex.test(documentId);
        const isUuid = isValidFormat && isValidUuid(documentId);
        if (isUuid) {
            parsedId = await drizDbWithInit((db) => db.query.documentUnits
                .findFirst({
                where: (du, { eq, and, or }) => or(and(eq(du.emailId, documentId), eq(du.documentType, 'email')), eq(du.documentPropertyId, documentId)),
                columns: {
                    unitId: true,
                },
            })
                .then((result) => result?.unitId)
                .catch((err) => {
                LoggedError.isTurtlesAllTheWayDownBaby(err, {
                    log: true,
                    source: 'resolveCaseFileId',
                    message: 'Error querying for case file ID - validate document ID format',
                    include: { documentId },
                });
                return undefined;
            }));
        }
        else {
            parsedId = parseInt(documentId, 10);
            if (isNaN(parsedId) || parsedId < 1) {
                parsedId = undefined;
            }
        }
    }
    else if (typeof documentId === 'number') {
        parsedId = documentId < 1 ? undefined : documentId;
    }
    else {
        parsedId = undefined;
    }
    return parsedId;
};
export const resolveCaseFileIdBatch = async (requests, options) => {
    const { getValue, setValue } = options ?? {
        getValue: (input) => input,
        setValue: (_input, value) => value,
    };
    const { valid, pending } = requests.reduce((acc, req) => {
        const request = req;
        const value = getValue(request);
        if (typeof value === 'number') {
            acc.valid.push(setValue(request, value));
            return acc;
        }
        if (typeof value === 'string') {
            if (isValidUuid(value)) {
                acc.pending.push(setValue(request, value));
                return acc;
            }
            const check = value.trim();
            if (/^-?\d+$/.test(check)) {
                const parsedId = parseInt(value, 10);
                if (!isNaN(parsedId)) {
                    acc.valid.push(setValue(request, parsedId));
                }
            }
            return acc;
        }
        return acc;
    }, {
        valid: [],
        pending: [],
    });
    const guids = pending.map((x) => getValue(x));
    if (!guids.length) {
        return valid;
    }
    const records = await drizDbWithInit((db) => {
        return db.query.documentUnits.findMany({
            where: (du, { and, or, eq, inArray }) => or(and(inArray(du.emailId, guids), eq(du.documentType, 'email')), inArray(du.documentPropertyId, guids)),
            columns: {
                unitId: true,
                documentPropertyId: true,
                emailId: true,
            },
        });
    });
    const { resolved } = pending.reduce((acc, request) => {
        const matchValue = getValue(request);
        const record = records.find((r) => r.documentPropertyId === matchValue || r.emailId === matchValue);
        if (record) {
            acc.resolved.push(setValue(request, record.unitId));
        }
        return acc;
    }, { resolved: valid });
    return resolved;
};
//# sourceMappingURL=resolve-case-file-id.js.map