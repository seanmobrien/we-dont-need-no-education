/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * @jest-environment node
 */
jest.mock('@/lib/neondb');

import { ViolationDetailsRepository } from '@/lib/api/email/properties/violation-details/violation-details-repository';
import { ValidationError } from '@/lib/react-util';
import { query, queryExt } from '@/lib/neondb';
import { ViolationDetails } from '@/data-models/api';

describe('ViolationDetailsRepository', () => {
  let repository: ViolationDetailsRepository;

  beforeEach(() => {
    repository = new ViolationDetailsRepository();
    (queryExt as jest.Mock).mockImplementation(() => []);
    (query as jest.Mock).mockImplementation(() => []);
  });

  afterEach(() => {});

  describe('validate', () => {
    it('should generate a new UUID for create method if propertyId is missing', () => {
      const obj = {} as ViolationDetails;
      (repository as any).validate('create', obj);
      expect(obj.propertyId).toBeDefined();
    });

    it('should throw ValidationError for update method if propertyId is missing', () => {
      const obj = {} as ViolationDetails;
      expect(() => (repository as any).validate('update', obj)).toThrow(
        ValidationError,
      );
    });

    it('should not modify the object for other methods', () => {
      const obj = { propertyId: 'test-id' } as ViolationDetails;
      (query as jest.Mock).mockReturnValue({
        propertyId: 'test-id',
        attachmentId: 1,
        keyPointPropertyId: 'key-point-id',
        actionPropertyId: 'action-id',
        violationType: 'test-violation',
        severityLevel: 2,
        detectedBy: 'test-detector',
        detectedOn: new Date(),
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
      expect(sqlQuery).toContain('SELECT * FROM violation_details');
      expect(values).toEqual([]);
      expect(sqlCountQuery).toContain(
        'SELECT COUNT(*) as records FROM violation_details',
      );
    });
  });

  describe('getQueryProperties', () => {
    it('should return the correct SQL query and parameters for a given recordId', () => {
      const recordId = 'test-id';
      const [sqlQuery, values] = (repository as any).getQueryProperties(
        recordId,
      );
      expect(sqlQuery).toContain('SELECT * FROM violation_details');
      expect(values).toEqual([recordId]);
    });
  });

  describe('getCreateQueryProperties', () => {
    it('should return the correct SQL query and parameters for a given ViolationDetails object', () => {
      const obj: ViolationDetails = {
        propertyId: 'test-id',
        attachmentId: 1,
        keyPointPropertyId: 'key-point-id',
        actionPropertyId: 'action-id',
        violationType: 'test-violation',
        severityLevel: 2,
        emailId: 'test-email-id',
        createdOn: new Date(),
        value: 'test-value',
        detectedBy: 'test-detector',
        detectedOn: new Date(),
      };
      const [sqlQuery, values] = (repository as any).getCreateQueryProperties(
        obj,
      );
      expect(sqlQuery).toContain('INSERT INTO email_property');
      expect(values).toEqual([
        obj.value,
        obj.propertyId,
        obj.emailId,
        obj.createdOn,
        obj.attachmentId,
        obj.keyPointPropertyId,
        obj.actionPropertyId,
        obj.violationType,
        obj.severityLevel,
        obj.detectedBy,
        obj.detectedOn,
      ]);
    });
  });

  describe('updateQueryProperties', () => {
    it('should return the correct SQL query and parameters for a given ViolationDetails object', () => {
      const obj: ViolationDetails = {
        propertyId: 'test-id',
        attachmentId: 1,
        keyPointPropertyId: 'key-point-id',
        actionPropertyId: 'action-id',
        violationType: 'test-violation',
        severityLevel: 2,
        emailId: 'test-email-id',
        createdOn: new Date(),
        value: 'test-value',
        detectedBy: 'test-detector',
        detectedOn: new Date(),
      };
      const [fieldMap] = (repository as any).getUpdateQueryProperties(obj);
      expect(fieldMap).toEqual({
        attachment_id: obj.attachmentId,
        key_point_property_id: obj.keyPointPropertyId,
        action_property_id: obj.actionPropertyId,
        violation_type: obj.violationType,
        severity_level: obj.severityLevel,
        detected_by: obj.detectedBy,
        detected_on: obj.detectedOn,
      });
    });
  });
});
