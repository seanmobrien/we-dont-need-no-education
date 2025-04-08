/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * @jest-environment node
 */
jest.mock('@/lib/neondb');

import { CallToActionDetailsRepository } from '@/lib/api/email/properties/call-to-action/cta-details-repository';
import { ValidationError } from '@/lib/react-util';
import { query, queryExt } from '@/lib/neondb';
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
      expect(sqlQuery).toContain('SELECT * FROM call_to_action_details');
      expect(values).toEqual([recordId]);
    });
  });

  describe('getCreateQueryProperties', () => {
    it('should return the correct SQL query and parameters for a given CallToActionDetails object', () => {
      const obj: CallToActionDetails = {
        propertyId: 'test-id',
        openedDate: new Date(),
        closedDate: new Date(),
        compliancyCloseDate: new Date(),
        completionPercentage: 50,
        policyId: 1,
        value: 'test-value',
        documentId: 2,
        createdOn: new Date(),
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
        obj.openedDate,
        obj.closedDate,
        obj.compliancyCloseDate,
        obj.completionPercentage,
        obj.policyId,
      ]);
    });
  });

  describe('updateQueryProperties', () => {
    it('should return the correct SQL query and parameters for a given CallToActionDetails object', () => {
      const obj: CallToActionDetails = {
        propertyId: 'test-id',
        openedDate: new Date(),
        closedDate: new Date(),
        compliancyCloseDate: new Date(),
        completionPercentage: 50,
        policyId: 1,
        value: 'test-value',
        documentId: 2,
        createdOn: new Date(),
      };
      const [fieldMap] = (repository as any).getUpdateQueryProperties(obj);
      expect(fieldMap).toEqual({
        opened_date: obj.openedDate,
        closed_date: obj.closedDate,
        compliancy_close_date: obj.compliancyCloseDate,
        completion_percentage: obj.completionPercentage,
        policy_id: obj.policyId,
        property_value: obj.value,
        email_id: obj.documentId,
        created_on: obj.createdOn,
      });
    });
  });
});
