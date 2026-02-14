import { EmailPropertyRepository, EmailPropertyTypeRepository, } from '@/lib/api/email/properties';
import { EmailPropertyCategoryTypeId, } from '@/data-models/api/email-properties/property-type';
import { TransactionalStateManagerBase } from '../default/transactional-statemanager';
import { AggregateError } from '@/lib/react-util/errors/aggregate-error';
import { isError, LoggedError, CustomAppInsightsEvent, log } from '@compliance-theater/logger';
import { newUuid } from '@compliance-theater/typescript';
const EmailPropertyTypeMap = new Map();
const parseEmailId = (x) => {
    const match = x.match(/<([^>]+)>/);
    return match ? match[1] : x;
};
const HeadersWithArrayValueMap = {
    To: { split: ',' },
    Cc: { split: ',' },
    Bcc: { split: ',' },
    'In-Reply-To': { split: ' ', parse: parseEmailId },
    References: { split: ' ', parse: parseEmailId },
    'Return-Path': { parse: parseEmailId },
    'Message-ID': { parse: parseEmailId },
};
const HeadersWithArrayValueKeys = Object.keys(HeadersWithArrayValueMap);
const indexOfHeaderWithArrayKey = (headerName) => HeadersWithArrayValueKeys.findIndex((x) => x.toLowerCase() === headerName.toLowerCase());
const getHeaderWithArraySplitBy = (headerName) => {
    const indexOf = indexOfHeaderWithArrayKey(headerName);
    return indexOf === -1
        ? undefined
        : HeadersWithArrayValueMap[HeadersWithArrayValueKeys[indexOf]];
};
class HeaderStateManager extends TransactionalStateManagerBase {
    #importEvent;
    constructor(stage, options) {
        super(stage, options);
    }
    async begin(context) {
        this.#importEvent = new CustomAppInsightsEvent('import::headers');
        this.#importEvent.startTimer('header-import');
        super.begin(context);
        if (EmailPropertyTypeMap.size === 0) {
            const emailPropertyRepository = new EmailPropertyTypeRepository();
            const data = await emailPropertyRepository.listForCategory('Email Header');
            data.results.forEach((property) => {
                EmailPropertyTypeMap.set(property.name, property.typeId);
            });
        }
        return context;
    }
    async run(context) {
        const { target, currentStage } = context;
        if (typeof target !== 'object') {
            throw new Error(`Expected source message: ${currentStage}`);
        }
        const emailPropertyRepository = new EmailPropertyRepository();
        const emailPropertyTypeRepository = new EmailPropertyTypeRepository();
        const operations = target.raw?.payload?.headers?.map((header) => {
            if (!header || !header.name || !header.value) {
                const noHeaderRet = Promise.resolve({
                    name: header.name ?? 'Missing',
                    status: 'skipped',
                    typeId: -1,
                });
                return noHeaderRet;
            }
            const { name: headerName, value: headerValue } = header;
            return new Promise(async (resolve, reject) => {
                let typeId = -1;
                try {
                    typeId = EmailPropertyTypeMap.get(headerName) ?? -1;
                    if (typeId === -1) {
                        const newPropertyType = await emailPropertyTypeRepository.create({
                            categoryId: EmailPropertyCategoryTypeId.EmailHeader,
                            name: headerName,
                            createdOn: new Date(),
                        });
                        if (!newPropertyType || !newPropertyType.typeId) {
                            throw new Error('An unexpected failure occurred while creating a new email property type.');
                        }
                        typeId = newPropertyType.typeId;
                        EmailPropertyTypeMap.set(headerName, typeId);
                    }
                    const headerParseOptions = getHeaderWithArraySplitBy(headerName);
                    if (headerParseOptions) {
                        const parts = headerParseOptions.split
                            ? headerValue.split(headerParseOptions.split)
                            : [headerValue];
                        const valueParser = headerParseOptions.parse ?? ((x) => x);
                        const operations = await Promise.all(parts.map((part) => {
                            const newProperty = {
                                documentId: target.documentId,
                                value: valueParser(part).trim(),
                                propertyId: newUuid(),
                                createdOn: new Date(),
                                typeId: typeId,
                            };
                            return emailPropertyRepository.create(newProperty).then((result) => {
                                if (!result || !result.propertyId) {
                                    return {
                                        status: 'failure',
                                        error: new Error('An unexpected failure occurred while creating a new email property.'),
                                    };
                                }
                                this.#importEvent.increment('processed');
                                return { status: 'success', result };
                            }, (error) => ({
                                status: 'failure',
                                error: isError(error) ? error : new Error(error),
                            }));
                        }));
                        const allErrors = operations.filter((x) => x.status === 'failure');
                        if (allErrors.length > 0) {
                            throw new AggregateError('An unexpected failure occurred while importing message headers.', ...allErrors.map((x) => x.error));
                        }
                        const successfulOps = operations;
                        const { documentId, propertyId } = successfulOps[0].result;
                        log((l) => l.verbose({
                            message: `Created array of email property for email header ${headerName}: ${operations.length} items created.`,
                            headerName,
                            documentId,
                            propertyId,
                            typeId,
                            count: operations.length,
                        }));
                    }
                    else {
                        const newProperty = {
                            documentId: target.documentId,
                            value: headerValue,
                            propertyId: newUuid(),
                            createdOn: new Date(),
                            typeId,
                        };
                        const result = await emailPropertyRepository.create(newProperty);
                        if (!result || !result.propertyId) {
                            throw new Error('An unexpected failure occurred while creating a new email property.');
                        }
                        log((l) => l.verbose({
                            message: `Created email property for email header `,
                            headerName,
                            documentId: result.documentId,
                            propertyId: result.propertyId,
                            typeId: result.typeId,
                        }));
                        this.#importEvent.increment('processed');
                    }
                    resolve({ name: headerName, status: 'success', typeId });
                }
                catch (error) {
                    const le = LoggedError.isTurtlesAllTheWayDownBaby(error, {
                        log: true,
                        source: 'HeaderStateManager',
                        message: 'An unexpected error occurred while processing email headers.',
                    });
                    resolve({
                        name: headerName,
                        status: 'failure',
                        typeId,
                        reason: le.message,
                    });
                }
                reject(new Error('An unexpected error occurred while processing email headers.'));
            });
        });
        const allHeaders = await Promise.all(operations);
        if (allHeaders.some((header) => header.status === 'failure')) {
            throw new Error('An unexpected error occurred while processing email headers.');
        }
        return context;
    }
}
const managerFactory = (stage, addOps) => new HeaderStateManager(stage, addOps);
export default managerFactory;
//# sourceMappingURL=manager-header.js.map