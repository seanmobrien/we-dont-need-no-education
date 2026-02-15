 
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
      expect(sqlQuery).toContain('SELECT * FROM call_to_action_details');
      expect(values).toEqual([]);
      expect(sqlCountQuery).toContain(
        'SELECT COUNT(*) as records FROM call_to_action_details',
      );
    });
  });

  describe('getQueryProperties', () => {
    it('should return the correct SQL query and parameters for a given recordId', () => {
      const recordId = 'test-id';
      const [sqlQuery, values] = (repository as any).getQueryProperties(
        recordId,
      );
      expect(sqlQuery).toContain(
        'SELECT ep.*, ept.property_name,epc.description, epc.email_property_category_id',
      );
      expect(values).toEqual([recordId]);
    });
  });

  describe('getCreateQueryProperties', () => {
    it('should return the correct SQL query and parameters for a given CallToActionDetails object', () => {
      const obj: CallToActionDetails = {
        propertyId: 'test-id',
        opened_date: new Date(),
        closed_date: new Date(),
        compliancy_close_date: new Date(),
        completion_percentage: 50,
        value: 'test-value',
        documentId: 2,
        createdOn: new Date(),
        inferred: false,
        compliance_date_enforceable: true,
      };
      const [sqlQuery, values] = (repository as any).getCreateQueryProperties(
        obj,
      );
      expect(sqlQuery).toContain('INSERT INTO document_property');
      expect(values).toEqual([
        obj.value,
        obj.propertyId,
        obj.documentId,
        obj.createdOn,
        null,
        null,
        obj.opened_date,
        obj.closed_date,
        obj.compliancy_close_date,
        obj.completion_percentage,
        null,
        obj.inferred ?? null,
        obj.compliance_date_enforceable ?? null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
      ]);
    });
  });

  describe('updateQueryProperties', () => {
    it('should return the correct SQL query and parameters for a given CallToActionDetails object', () => {
      const obj: CallToActionDetails = {
        propertyId: 'test-id',
        opened_date: new Date(),
        closed_date: new Date(),
        compliancy_close_date: new Date(),
        completion_percentage: 50,
        value: 'test-value',
        documentId: 2,
        createdOn: new Date(),
        inferred: false,
        compliance_date_enforceable: true,
      };
      const [fieldMap] = (repository as any).getUpdateQueryProperties(obj);
      expect(fieldMap).toEqual({
        closed_date: obj.closed_date,
        closure_actions: undefined,
        completion_percentage: obj.completion_percentage,
        compliance_date_enforceable: obj.compliance_date_enforceable ?? null,
        compliance_rating: undefined,
        compliance_rating_reasons: undefined,
        compliancy_close_date: obj.compliancy_close_date,
        inferred: obj.inferred ?? null,
        opened_date: obj.opened_date,
        reasonable_reasons: undefined,
        reasonable_request: undefined,
        sentiment: undefined,
        sentiment_reasons: undefined,
        severity: undefined,
        severity_reason: undefined,
        title_ix_applicable: undefined,
        title_ix_applicable_reasons: undefined,
      });
    });
  });
});
