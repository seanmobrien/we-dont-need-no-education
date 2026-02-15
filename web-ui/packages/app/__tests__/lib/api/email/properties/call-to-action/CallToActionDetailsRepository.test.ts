 
/**
 * @jest-environment node
 */
jest.mock('@compliance-theater/database/driver');

import { CallToActionDetailsRepository } from '@/lib/api/email/properties/call-to-action/cta-details-repository';
import { ValidationError } from '@compliance-theater/react/errors/validation-error';
import { query, queryExt } from '@compliance-theater/database/driver';
import { CallToActionDetails } from '@/data-models/api';

describe('CallToActionDetailsRepository', () => {
  let repository: CallToActionDetailsRepository;

  beforeEach(() => {
    repository = new CallToActionDetailsRepository();
    (queryExt as jest.Mock).mockImplementation(() => []);
    (query as jest.Mock).mockImplementation(() => []);
  });

  afterEach(() => {});

  describe('validate', () => {
    it('should generate a new UUID for create method if propertyId is missing', () => {
      const obj = {} as CallToActionDetails;
      (repository as any).validate('create', obj);
      expect(obj.propertyId).toBeDefined();
    });

    it('should throw ValidationError for update method if propertyId is missing', () => {
      const obj = {} as CallToActionDetails;
      expect(() => (repository as any).validate('update', obj)).toThrow(
        ValidationError,
      );
    });

    it('should not modify the object for other methods', () => {
      const obj = { propertyId: 'test-id' } as CallToActionDetails;
      (query as jest.Mock).mockReturnValue({
        propertyId: 'test-id',
        openedDate: new Date(),
        closedDate: new Date(),
        compliancyCloseDate: new Date(),
        completionPercentage: 50,
        policyId: 1,
        value: 'test-value',
        emailId: 'email-id',
        createdOn: new Date(),
      });
      (repository as any).validate('update', obj);
      expect(obj.propertyId).toBe('test-id');
    });
  });

  describe('getListQueryProperties', () => {
    it('should return the correct SQL query and parameters', () => {
      const [sqlQuery, values, sqlCountQuery] = (
        repository as any
      ).getListQueryProperties();
      expect(sqlQuery).toContain('FROM call_to_action_details');
      expect(sqlQuery).toContain(
        'JOIN document_property ON call_to_action_details.property_id = document_property.property_id',
      );
      expect(sqlQuery).toContain('ORDER BY call_to_action_details.property_id');
      expect(values).toEqual([]);
      expect(sqlCountQuery).toContain('FROM call_to_action_details');
    });
  });

  describe('getQueryProperties', () => {
    it('should return the correct SQL query and parameters for a given recordId', () => {
      const recordId = 'test-id';
      const [sqlQuery, values] = (repository as any).getQueryProperties(
        recordId,
      );
      const normalize = (str: string) => str.replace(/\s+/g, ' ').trim();
      const expectedSql = `SELECT ep.*, ept.property_name,epc.description, epc.email_property_category_id,
      cta.opened_date, cta.closed_date, cta.compliancy_close_date, cta.completion_percentage, 
      cta.compliance_rating, cta.inferred, cta.compliance_date_enforceable, cta.reasonable_request, 
      cta.reasonable_reasons, cta.sentiment, cta.sentiment_reasons, cta.compliance_rating_reasons, 
      cta.severity, cta.severity_reason, cta.title_ix_applicable, cta.title_ix_applicable_reasons, 
      cta.closure_actions
      FROM document_property ep
        JOIN call_to_action_details cta ON cta.property_id = ep.property_id
        JOIN email_property_type ept ON ept.document_property_type_id = ep.document_property_type_id
        JOIN email_property_category epc ON ept.email_property_category_id = epc.email_property_category_id
  WHERE cta.property_id = $1`;
      expect(normalize(sqlQuery)).toContain(normalize(expectedSql));
      expect(values).toEqual([recordId]);
    });
  });

  describe('getCreateQueryProperties', () => {
    it('should return the correct SQL query and parameters for a given CallToActionDetails object', () => {
      const obj: CallToActionDetails = {
        propertyId: 'test-id',
        inferred: false,
        compliance_date_enforceable: true,
        opened_date: new Date(),
        closed_date: new Date(),
        compliancy_close_date: new Date(),
        completion_percentage: 50,
        value: 'test-value',
        documentId: 2,
        createdOn: new Date(),
      };
      const [sqlQuery, values] = (repository as any).getCreateQueryProperties(
        obj,
      );
      expect(sqlQuery).toContain('INSERT INTO document_property');
      // The actual implementation returns an array of 23 elements, so we check the first few and the length
      expect(values.length).toBe(23);
      expect(values[0]).toBe(obj.value);
      expect(values[1]).toBe(obj.propertyId);
      expect(values[2]).toBe(obj.documentId);
      expect(values[3]).toBe(obj.createdOn);
      expect(values[4]).toBe(null);
      expect(values[5]).toBe(null);
      expect(values[6]).toBe(obj.opened_date);
      expect(values[7]).toBe(obj.closed_date);
      expect(values[8]).toBe(obj.compliancy_close_date);
      expect(values[9]).toBe(obj.completion_percentage);
    });
  });

  describe('updateQueryProperties', () => {
    it('should return the correct SQL query and parameters for a given CallToActionDetails object', () => {
      const obj: CallToActionDetails = {
        propertyId: 'test-id',
        inferred: false,
        compliance_date_enforceable: true,
        opened_date: new Date(),
        closed_date: new Date(),
        compliancy_close_date: new Date(),
        completion_percentage: 50,
        value: 'test-value',
        documentId: 2,
        createdOn: new Date(),
      };
      const [fieldMap] = (repository as any).getUpdateQueryProperties(obj);
      expect(fieldMap).toEqual({
        opened_date: obj.opened_date,
        closed_date: obj.closed_date,
        compliancy_close_date: obj.compliancy_close_date,
        completion_percentage: obj.completion_percentage,
        compliance_rating: undefined,
        inferred: false,
        compliance_date_enforceable: true,
        reasonable_request: undefined,
        reasonable_reasons: undefined,
        sentiment: undefined,
        sentiment_reasons: undefined,
        compliance_rating_reasons: undefined,
        severity: undefined,
        severity_reason: undefined,
        title_ix_applicable: undefined,
        title_ix_applicable_reasons: undefined,
        closure_actions: undefined,
      });
    });
  });
});
