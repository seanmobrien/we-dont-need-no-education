import type { PaginatedResultset, PaginationStats } from '@/data-models/_types';
import type {
  KeyPointsDetails,
  CallToActionDetails,
  CallToActionResponseDetails,
  ComplianceScoresDetails,
  EmailSentimentAnalysisDetails,
  ViolationDetails,
} from '@/data-models/api/email-properties/extended-properties';
import type { EmailPropertySummary } from '@/data-models/api/email-properties/property-type';
import siteMap from '@/lib/site-util/url-builder';
import {
  apiRequestHelperFactory,
  ApiRequestHelper,
} from '@/lib/send-api-request';
import { ICancellablePromiseExt } from '@/lib/typescript';

const apiRequest = <TResult>(
  cb: (
    api: ApiRequestHelper,
    builder: typeof siteMap.api.email.properties,
  ) => TResult,
): TResult => {
  const apiHelper = apiRequestHelperFactory({ area: 'email/properties' });
  const builder = siteMap.api.email.properties;
  return cb(apiHelper, builder);
};

type ListRequestProps = Partial<Omit<PaginationStats, 'total'>> & {
  emailId: string;
  api: keyof ReturnType<typeof siteMap.api.email.properties>;
};

const listPropertyRequest = <
  TModel extends Omit<EmailPropertySummary, 'typeId'>,
>({
  api,
  page,
  num,
  emailId,
}: ListRequestProps): ICancellablePromiseExt<PaginatedResultset<TModel>> =>
  apiRequest((apiHelper, builder) => {
    const b = builder(emailId)[api] as (props: object) => URL;
    return apiHelper.get<PaginatedResultset<TModel>>({
      url: b({ page, num }),
      action: 'list',
    });
  });

/**
 * Retrieves email headers by making a property list request.
 *
 * @param props - The properties for the list request, including any necessary parameters.
 * @returns The result of the property list request for email headers.
 */
export const getEmailHeaders = (props: Omit<ListRequestProps, 'api'>) =>
  listPropertyRequest({ ...props, api: 'emailHeader' });

/**
 * Retrieves key points by making a property list request.
 *
 * @param props - The properties for the list request, including any necessary parameters.
 * @returns The result of the property list request for key points.
 */
export const getKeyPoints = (props: Omit<ListRequestProps, 'api'>) =>
  listPropertyRequest<KeyPointsDetails>({ ...props, api: 'keyPoints' });

/**
 * Retrieves call-to-action details by making a property list request.
 *
 * @param props - The properties for the list request, including any necessary parameters.
 * @returns The result of the property list request for call-to-action details.
 */
export const getCallToAction = (props: Omit<ListRequestProps, 'api'>) =>
  listPropertyRequest<CallToActionDetails>({ ...props, api: 'callToAction' });

/**
 * Retrieves call-to-action responses by making a property list request.
 *
 * @param props - The properties for the list request, including any necessary parameters.
 * @returns The result of the property list request for call-to-action responses.
 */
export const getCallToActionResponse = (props: Omit<ListRequestProps, 'api'>) =>
  listPropertyRequest<CallToActionResponseDetails>({
    ...props,
    api: 'callToActionResponse',
  });

/**
 * Retrieves compliance scores by making a property list request.
 *
 * @param props - The properties for the list request, including any necessary parameters.
 * @returns The result of the property list request for compliance scores.
 */
export const getComplianceScores = (props: Omit<ListRequestProps, 'api'>) =>
  listPropertyRequest<ComplianceScoresDetails>({
    ...props,
    api: 'complianceScores',
  });

/**
 * Retrieves sentiment analysis by making a property list request.
 *
 * @param props - The properties for the list request, including any necessary parameters.
 * @returns The result of the property list request for sentiment analysis.
 */
export const getSentimentAnalysis = (props: Omit<ListRequestProps, 'api'>) =>
  listPropertyRequest<EmailSentimentAnalysisDetails>({
    ...props,
    api: 'sentimentAnalysis',
  });

/**
 * Retrieves violation details by making a property list request.
 *
 * @param props - The properties for the list request, including any necessary parameters.
 * @returns The result of the property list request for violation details.
 */
export const getViolationDetails = (props: Omit<ListRequestProps, 'api'>) =>
  listPropertyRequest<ViolationDetails>({ ...props, api: 'violationDetails' });

/**
 * Retrieves notes by making a property list request.
 *
 * @param props - The properties for the list request, including any necessary parameters.
 * @returns The result of the property list request for notes.
 */
export const getNotes = (props: Omit<ListRequestProps, 'api'>) =>
  listPropertyRequest({ ...props, api: 'notes' });
