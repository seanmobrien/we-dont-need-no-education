 
/**
 * @jest-environment node
 */
jest.mock('@/lib/neondb');

import { CallToActionResponseDetailsRepository } from '@/lib/api/email/properties/call-to-action-response/call-to-action-response-details-repository';
import { ValidationError } from '@/lib/react-util/errors/validation-error';
import { query, queryExt } from '@/lib/neondb';
import { CallToActionResponseDetails } from '@/data-models/api';

describe('CallToActionResponseDetailsRepository', () => {
  let repository: CallToActionResponseDetailsRepository;

  beforeEach(() => {
    repository = new CallToActionResponseDetailsRepository();
    (queryExt as jest.Mock).mockImplementation(() => []);
    (query as jest.Mock).mockImplementation(() => []);
  });

  afterEach(() => {});

  describe('validate', () => {
    it('should generate a new UUID for create method if propertyId is missing', () => {
      const obj = {} as CallToActionResponseDetails;
      (repository as any).validate('create', obj);
      expect(obj.propertyId).toBeDefined();
    });

    it('should throw ValidationError for update method if propertyId is missing', () => {
      const obj = {} as CallToActionResponseDetails;
      expect(() => (repository as any).validate('update', obj)).toThrow(
        ValidationError,
      );
    });

    it('should not modify the object for other methods', () => {
      const obj = { propertyId: 'test-id' } as CallToActionResponseDetails;
      (query as jest.Mock).mockReturnValue({
        propertyId: 'test-id',
        actionPropertyId: 'action-id',
        completionPercentage: 50,
        responseTimestamp: new Date(),
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
      expect(sqlQuery).toContain(
        'SELECT * FROM call_to_action_response_details',
      );
      expect(values).toEqual([]);
      expect(sqlCountQuery).toContain(
        'SELECT COUNT(*) as records FROM call_to_action_response_details',
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
        'SELECT ep.*, ept.property_name, epc.description, epc.email_property_category_id',
      );
      expect(values).toEqual([recordId]);
    });
  });

  describe('getCreateQueryProperties', () => {
    it('should return the correct SQL query and parameters for a given CallToActionResponseDetails object', () => {
      const obj: CallToActionResponseDetails = {
        propertyId: 'test-id',
        actionPropertyId: 'action-id',
        completionPercentage: 50,
        responseTimestamp: new Date(),
      } as CallToActionResponseDetails;
      const [sqlQuery, values] = (repository as any).getCreateQueryProperties(
        obj,
      );
      expect(sqlQuery).toContain('INSERT INTO document_property');
      expect(values).toEqual([
        obj.value,
        obj.propertyId,
        obj.documentId,
        values[3],
        obj.actionPropertyId,
        obj.completionPercentage,
        obj.responseTimestamp,
        null,
        null,
      ]);
    });
  });

  describe('updateQueryProperties', () => {
    it('should return the correct SQL query and parameters for a given CallToActionResponseDetails object', () => {
      const obj: CallToActionResponseDetails = {
        propertyId: 'test-id',
        actionPropertyId: 'action-id',
        completionPercentage: 50,
        responseTimestamp: new Date(),
      } as CallToActionResponseDetails;
      const [fieldMap] = (repository as any).getUpdateQueryProperties(obj);
      expect(fieldMap).toEqual({
        action_property_id: obj.actionPropertyId,
        completion_percentage: obj.completionPercentage,
        response_timestamp: obj.responseTimestamp,
      });
    });
  });
});
