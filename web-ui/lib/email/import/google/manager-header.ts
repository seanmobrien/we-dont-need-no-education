import {
  EmailPropertyRepository,
  EmailPropertyTypeRepository,
} from '@/lib/api/email/properties';

import {
  ImportStage,
  EmailProperty,
  EmailPropertyCategoryTypeId,
} from '@/data-models/api/import/email-message';
import {
  StageProcessorContext,
  ImportStageManagerFactory,
  AdditionalStageOptions,
} from '../types';
import { TransactionalStateManagerBase } from '../default/transactional-statemanager';
import { LoggedError } from '@/lib/react-util';
import { log } from '@/lib/logger';
import { newUuid } from '@/lib/typescript';
const EmailPropertyTypeMap: Map<string, number> = new Map();

class HeaderStateManager extends TransactionalStateManagerBase {
  constructor(stage: ImportStage, options: AdditionalStageOptions) {
    super(stage, options);
  }

  async begin(context: StageProcessorContext) {
    super.begin(context);
    // Load a map of currently known email header identifiers
    if (EmailPropertyTypeMap.size === 0) {
      const emailPropertyRepository: EmailPropertyTypeRepository =
        new EmailPropertyTypeRepository();
      const data = await emailPropertyRepository.listForCategory(
        'Email Header'
      );
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
                'An unexpected failure occurred while creating a new email property type.'
              );
            }
            // then add it to our local cache for re-use and move on
            typeId = newPropertyType.typeId as number;
            EmailPropertyTypeMap.set(headerName, typeId);
          }
          const newProperty: EmailProperty = {
            emailId: target.targetId!,
            value: headerValue,
            propertyId: newUuid(),
            createdOn: new Date(),
            typeId,
          };
          const result = await emailPropertyRepository.create(newProperty);
          if (!result || !result.propertyId) {
            throw new Error(
              'An unexpected failure occurred while creating a new email property.'
            );
          }
          log((l) =>
            l.verbose({
              message: `Created email property for email header `,
              headerName,
              emailId: result.emailId,
              propertyId: result.propertyId,
              typeId: result.typeId,
            })
          );
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
            'An unexpected error occurred while processing email headers.'
          )
        );
      });
    }) as Promise<HeaderUploadStatus>[];
    const allHeaders = await Promise.all(operations);
    if (allHeaders.some((header) => header.status === 'failure')) {
      throw new Error(
        'An unexpected error occurred while processing email headers.'
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
  addOps: AdditionalStageOptions
) => new HeaderStateManager(stage, addOps);

export default managerFactory;
