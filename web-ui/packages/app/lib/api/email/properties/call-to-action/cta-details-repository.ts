import { BaseObjectRepository } from '../../../_baseObjectRepository';
import { ObjectRepository } from '../../../_types';
import { ValidationError } from '@/lib/react-util/errors/validation-error';
import { FirstParameter, newUuid } from '@compliance-theater/lib-typescript';
import { CallToActionDetails } from '@/data-models/api';
import {
  EmailPropertyRepository,
  mapEmailPropertyRecordToObject,
} from '../email-property-repository';
import { TransformedFullQueryResults } from '@/lib/neondb';

const mapRecordToObject = (
  record: Record<string, unknown>,
): CallToActionDetails => {
  return {
    ...mapEmailPropertyRecordToObject(record),
    opened_date: record.opened_date
      ? new Date(String(record.opened_date))
      : null,
    closed_date: record.closed_date
      ? new Date(String(record.closed_date))
      : null,
    compliancy_close_date: record.compliancy_close_date
      ? new Date(String(record.compliancy_close_date))
      : null,
    completion_percentage: Number(record.completion_percentage),
    compliance_rating:
      record.compliance_rating !== undefined &&
      record.compliance_rating !== null
        ? Number(record.compliance_rating)
        : null,
    inferred: Boolean(record.inferred),
    compliance_date_enforceable: Boolean(record.compliance_date_enforceable),
    sentiment:
      record.sentiment !== undefined && record.sentiment !== null
        ? Number(record.sentiment)
        : null,
    sentiment_reasons: Array.isArray(record.sentiment_reasons)
      ? (record.sentiment_reasons as string[])
      : record.sentiment_reasons
        ? String(record.sentiment_reasons).split(',')
        : null,
    compliance_rating_reasons: Array.isArray(record.compliance_rating_reasons)
      ? (record.compliance_rating_reasons as string[])
      : record.compliance_rating_reasons
        ? String(record.compliance_rating_reasons).split(',')
        : null,
    severity:
      record.severity !== undefined && record.severity !== null
        ? Number(record.severity)
        : null,
    severity_reason: Array.isArray(record.severity_reason)
      ? (record.severity_reason as string[])
      : record.severity_reason
        ? String(record.severity_reason).split(',')
        : null,
    title_ix_applicable:
      record.title_ix_applicable !== undefined &&
      record.title_ix_applicable !== null
        ? Number(record.title_ix_applicable)
        : null,
    title_ix_applicable_reasons: Array.isArray(
      record.title_ix_applicable_reasons,
    )
      ? (record.title_ix_applicable_reasons as string[])
      : record.title_ix_applicable_reasons
        ? String(record.title_ix_applicable_reasons).split(',')
        : null,
    closure_actions: Array.isArray(record.closure_actions)
      ? (record.closure_actions as string[])
      : record.closure_actions
        ? String(record.closure_actions).split(',')
        : null,

    compliance_average_chapter_13:
      record.compliance_average_chapter_13 !== undefined &&
      record.compliance_average_chapter_13 !== null
        ? Number(record.compliance_average_chapter_13)
        : null,
    compliance_chapter_13_reasons: Array.isArray(
      record.compliance_chapter_13_reasons,
    )
      ? (record.compliance_chapter_13_reasons as string[])
      : record.compliance_chapter_13_reasons
        ? String(record.compliance_chapter_13_reasons).split(',')
        : null,
  };
};

export class CallToActionDetailsRepository extends BaseObjectRepository<
  CallToActionDetails,
  'propertyId'
> {
  constructor() {
    super({
      tableName: 'call_to_action_details',
      idField: ['propertyId', 'property_id'],
      objectMap: mapRecordToObject,
      summaryMap: mapRecordToObject,
    });
  }

  validate<
    TMethod extends keyof ObjectRepository<CallToActionDetails, 'propertyId'>,
  >(
    method: TMethod,
    obj: FirstParameter<
      Pick<
        ObjectRepository<CallToActionDetails, 'propertyId'>,
        TMethod
      >[TMethod]
    >,
  ): void {
    const asModel = obj as CallToActionDetails;
    switch (method) {
      case 'create':
        if (!asModel.propertyId) {
          asModel.propertyId = newUuid();
        }
        break;
      case 'update':
        if (!asModel.propertyId) {
          throw new ValidationError({
            field: 'propertyId',
            source: 'CallToActionDetailsRepository',
          });
        }
        break;
      default:
        break;
    }
  }

  protected getListQueryProperties(): [string, Array<unknown>, string] {
    return [
      `SELECT * FROM call_to_action_details 
       JOIN document_property ON call_to_action_details.property_id = document_property.property_id 
       ORDER BY call_to_action_details.property_id`,
      [],
      `SELECT COUNT(*) as records FROM call_to_action_details`,
    ];
  }

  protected getQueryProperties(recordId: string): [string, Array<unknown>] {
    return [
      `SELECT ep.*, ept.property_name,epc.description, epc.email_property_category_id,
            cta.opened_date, cta.closed_date, cta.compliancy_close_date, cta.completion_percentage, 
            cta.compliance_rating, cta.inferred, cta.compliance_date_enforceable, cta.reasonable_request, 
            cta.reasonable_reasons, cta.sentiment, cta.sentiment_reasons, cta.compliance_rating_reasons, 
            cta.severity, cta.severity_reason, cta.title_ix_applicable, cta.title_ix_applicable_reasons, 
            cta.closure_actions
            FROM document_property ep 
             JOIN call_to_action_details cta ON cta.property_id = ep.property_id 
             JOIN email_property_type ept ON ept.document_property_type_id = ep.document_property_type_id
             JOIN email_property_category epc ON ept.email_property_category_id = epc.email_property_category_id
       WHERE cta.property_id = $1`,
      [recordId],
    ];
  }

  protected getCreateQueryProperties({
    propertyId,
    opened_date,
    closed_date,
    compliancy_close_date,
    completion_percentage,
    compliance_rating,
    inferred,
    compliance_date_enforceable,
    reasonable_request,
    reasonable_reasons,
    sentiment,
    sentiment_reasons,
    compliance_rating_reasons,
    severity,
    severity_reason,
    title_ix_applicable,
    title_ix_applicable_reasons,
    closure_actions,
    value,
    documentId,
    tags,
    policy_basis,
    createdOn,
  }: CallToActionDetails): [string, Array<unknown>] {
    return [
      `WITH ins1 AS (
        INSERT INTO document_property (property_value, document_property_type_id, property_id, document_id, created_on, tags, policy_basis) 
        VALUES ($1, 4, $2, $3, $4, $5, $6) RETURNING property_id
      )
      INSERT INTO call_to_action_details (
        property_id, opened_date, closed_date, compliancy_close_date, completion_percentage, compliance_rating, inferred, compliance_date_enforceable, reasonable_request, reasonable_reasons, sentiment, sentiment_reasons, compliance_rating_reasons, severity, severity_reason, title_ix_applicable, title_ix_applicable_reasons, closure_actions
      ) 
      VALUES (
        (SELECT property_id FROM ins1), $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24
      ) RETURNING *`,
      [
        value,
        propertyId,
        documentId,
        createdOn ?? new Date(),
        tags?.length ? tags : null,
        policy_basis?.length ? policy_basis : null,
        opened_date ?? null,
        closed_date ?? null,
        compliancy_close_date ?? null,
        completion_percentage ?? null,
        compliance_rating ?? null,
        inferred ?? null,
        compliance_date_enforceable ?? null,
        reasonable_request ?? null,
        reasonable_reasons ?? null,
        sentiment ?? null,
        sentiment_reasons ?? null,
        compliance_rating_reasons ?? null,
        severity ?? null,
        severity_reason ?? null,
        title_ix_applicable ?? null,
        title_ix_applicable_reasons ?? null,
        closure_actions ?? null,
      ],
    ];
  }

  protected getUpdateQueryProperties({
    opened_date,
    closed_date,
    compliancy_close_date,
    completion_percentage,
    compliance_rating,
    inferred,
    compliance_date_enforceable,
    reasonable_request,
    reasonable_reasons,
    sentiment,
    sentiment_reasons,
    compliance_rating_reasons,
    severity,
    severity_reason,
    title_ix_applicable,
    title_ix_applicable_reasons,
    closure_actions,
  }: CallToActionDetails): [Record<string, unknown>] {
    return [
      {
        opened_date: opened_date,
        closed_date: closed_date,
        compliancy_close_date: compliancy_close_date,
        completion_percentage: completion_percentage,
        compliance_rating: compliance_rating,
        inferred: inferred,
        compliance_date_enforceable: compliance_date_enforceable,
        reasonable_request: reasonable_request,
        reasonable_reasons: reasonable_reasons,
        sentiment: sentiment,
        sentiment_reasons: sentiment_reasons,
        compliance_rating_reasons: compliance_rating_reasons,
        severity: severity,
        severity_reason: severity_reason,
        title_ix_applicable: title_ix_applicable,
        title_ix_applicable_reasons: title_ix_applicable_reasons,
        closure_actions: closure_actions,
      },
    ];
  }
  /**
   * Override to append post-processing logic to the update query.
   * @param updateQuery Update query promise
   * @returns The updateQuery argument
   */
  protected postProcessUpdate({
    updateQuery,
    props,
  }: {
    props: CallToActionDetails;
    updateQuery: Promise<TransformedFullQueryResults<CallToActionDetails>>;
  }): Promise<TransformedFullQueryResults<CallToActionDetails>> {
    return updateQuery.then((result) => {
      const repo = new EmailPropertyRepository();
      return repo.update(props).then(() => result);
    });
  }
}
