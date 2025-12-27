import {
  EmailPropertyRepository,
  EmailPropertyTypeRepository,
} from '@/lib/api/email/properties';

import { ImportStage } from '@/data-models/api/import/email-message';
import {
  EmailProperty,
  EmailPropertyCategoryTypeId,
} from '@/data-models/api/email-properties/property-type';
import {
  StageProcessorContext,
  ImportStageManagerFactory,
  AdditionalStageOptions,
} from '../types';
import { TransactionalStateManagerBase } from '../default/transactional-statemanager';
import { AggregateError } from '@/lib/react-util/errors/aggregate-error';
import { isError } from '@/lib/react-util/utility-methods';
import { LoggedError } from '@/lib/react-util/errors/logged-error';
import { CustomAppInsightsEvent, log } from '@repo/lib-logger';
import { newUuid } from '@/lib/typescript';
const EmailPropertyTypeMap: Map<string, number> = new Map();
const parseEmailId = (x: string) => {
  const match = x.match(/<([^>]+)>/);
  return match ? match[1] : x;
};
type ParseHeaderArrayProps = {
  split?: string;
  parse?: (arg0: string) => string;
};
const HeadersWithArrayValueMap: Record<string, ParseHeaderArrayProps> = {
  To: { split: ',' },
  Cc: { split: ',' },
  Bcc: { split: ',' },
  'In-Reply-To': { split: ' ', parse: parseEmailId },
  References: { split: ' ', parse: parseEmailId },
  'Return-Path': { parse: parseEmailId },
  'Message-ID': { parse: parseEmailId },
} as const;
const HeadersWithArrayValueKeys: ReadonlyArray<
  keyof typeof HeadersWithArrayValueMap
> = Object.keys(HeadersWithArrayValueMap);
const indexOfHeaderWithArrayKey = (headerName: string): number =>
  HeadersWithArrayValueKeys.findIndex(
    (x: string) => x.toLowerCase() === headerName.toLowerCase(),
  );
const getHeaderWithArraySplitBy = (
  headerName: string,
): ParseHeaderArrayProps | undefined => {
  const indexOf = indexOfHeaderWithArrayKey(headerName);
  return indexOf === -1
    ? undefined
    : HeadersWithArrayValueMap[HeadersWithArrayValueKeys[indexOf]];
};

type HeaderFailedResult = { status: 'failure'; error: Error };
type HeaderSuccessResult = { status: 'success'; result: EmailProperty };
type HeaderSaveResult = HeaderSuccessResult | HeaderFailedResult;

class HeaderStateManager extends TransactionalStateManagerBase {
  #importEvent: CustomAppInsightsEvent | undefined;

  constructor(stage: ImportStage, options: AdditionalStageOptions) {
    super(stage, options);
  }

  async begin(context: StageProcessorContext) {
    this.#importEvent = new CustomAppInsightsEvent('import::headers');
    this.#importEvent.startTimer('header-import');
    super.begin(context);
    // Load a map of currently known email header identifiers
    if (EmailPropertyTypeMap.size === 0) {
      const emailPropertyRepository: EmailPropertyTypeRepository =
        new EmailPropertyTypeRepository();
      const data =
        await emailPropertyRepository.listForCategory('Email Header');
      data.results.forEach((property) => {
        EmailPropertyTypeMap.set(property.name, property.typeId as number);
      });
    }
    return context;
  }
  async run(context: StageProcessorContext) {
    const { target, currentStage } = context;
    if (typeof target !== 'object') {
      throw new Error(`Expected source message: ${currentStage}`);
    }
    // Get us some repositories
    const emailPropertyRepository: EmailPropertyRepository =
      new EmailPropertyRepository();
    const emailPropertyTypeRepository = new EmailPropertyTypeRepository();

    type HeaderUploadStatus = {
      name: string;
      status: 'success' | 'failure' | 'skipped';
      typeId: number;
      reason?: string;
    };

    const operations = target.raw?.payload?.headers?.map((header) => {
      if (!header || !header.name || !header.value) {
        const noHeaderRet = Promise.resolve<HeaderUploadStatus>({
          name: header.name ?? 'Missing',
          status: 'skipped',
          typeId: -1,
        });
        return noHeaderRet;
      }
      const { name: headerName, value: headerValue } = header;
      return new Promise<HeaderUploadStatus>(async (resolve, reject) => {
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
              throw new Error(
                'An unexpected failure occurred while creating a new email property type.',
              );
            }
            // then add it to our local cache for re-use and move on
            typeId = newPropertyType.typeId as number;
            EmailPropertyTypeMap.set(headerName, typeId);
          }

          const headerParseOptions = getHeaderWithArraySplitBy(headerName);
          if (headerParseOptions) {
            const parts = headerParseOptions.split
              ? headerValue.split(headerParseOptions.split)
              : [headerValue];
            const valueParser = headerParseOptions.parse ?? ((x: string) => x);
            const operations = await Promise.all(
              parts.map((part) => {
                const newProperty: EmailProperty = {
                  documentId: target.documentId!,
                  value: valueParser(part).trim(),
                  propertyId: newUuid(),
                  createdOn: new Date(),
                  typeId: typeId,
                };
                return emailPropertyRepository.create(newProperty).then(
                  (result) => {
                    if (!result || !result.propertyId) {
                      return {
                        status: 'failure',
                        error: new Error(
                          'An unexpected failure occurred while creating a new email property.',
                        ),
                      } as HeaderSaveResult;
                    }
                    this.#importEvent!.increment('processed');
                    return { status: 'success', result } as HeaderSaveResult;
                  },
                  (error) => ({
                    status: 'failure',
                    error: isError(error) ? error : new Error(error),
                  }),
                );
              }),
            );
            const allErrors = operations.filter(
              (x) => x.status === 'failure',
            ) as HeaderFailedResult[];
            if (allErrors.length > 0) {
              throw new AggregateError(
                'An unexpected failure occurred while importing message headers.',
                ...allErrors.map((x) => x.error),
              );
            }
            const successfulOps = operations as HeaderSuccessResult[];
            const { documentId, propertyId } = successfulOps[0].result;
            log((l) =>
              l.verbose({
                message: `Created array of email property for email header ${headerName}: ${operations.length} items created.`,
                headerName,
                documentId,
                propertyId,
                typeId,
                count: operations.length,
              }),
            );
          } else {
            const newProperty: EmailProperty = {
              documentId: target.documentId!,
              value: headerValue,
              propertyId: newUuid(),
              createdOn: new Date(),
              typeId,
            };
            const result = await emailPropertyRepository.create(newProperty);
            if (!result || !result.propertyId) {
              throw new Error(
                'An unexpected failure occurred while creating a new email property.',
              );
            }
            log((l) =>
              l.verbose({
                message: `Created email property for email header `,
                headerName,
                documentId: result.documentId,
                propertyId: result.propertyId,
                typeId: result.typeId,
              }),
            );
            this.#importEvent!.increment('processed');
          }
          resolve({ name: headerName, status: 'success', typeId });
        } catch (error) {
          const le = LoggedError.isTurtlesAllTheWayDownBaby(error, {
            log: true,
            source: 'HeaderStateManager',
            message:
              'An unexpected error occurred while processing email headers.',
          });
          resolve({
            name: headerName,
            status: 'failure',
            typeId,
            reason: le.message,
          });
        }
        reject(
          new Error(
            'An unexpected error occurred while processing email headers.',
          ),
        );
      });
    }) as Promise<HeaderUploadStatus>[];
    const allHeaders = await Promise.all(operations);
    if (allHeaders.some((header) => header.status === 'failure')) {
      throw new Error(
        'An unexpected error occurred while processing email headers.',
      );
    }
    return context;
  }
}

/**
 * Factory function to create an ImportStageManager instance.
 *
 * @param options - The options to configure the manager.
 * @returns An ImportStageManager instance configured with the provided options.
 */
const managerFactory: ImportStageManagerFactory = (
  stage: ImportStage,
  addOps: AdditionalStageOptions,
) => new HeaderStateManager(stage, addOps);

export default managerFactory;
