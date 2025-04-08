/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * @jest-environment node
 */
jest.mock('@/lib/neondb');

import { KeyPointsDetailsRepository } from '@/lib/api/email/properties/key-points/key-points-details-repository';
import { ValidationError } from '@/lib/react-util';
import { query, queryExt } from '@/lib/neondb';
import { KeyPointsDetails } from '@/data-models/api';

describe('KeyPointsDetailsRepository', () => {
  let repository: KeyPointsDetailsRepository;

  beforeEach(() => {
    repository = new KeyPointsDetailsRepository();
    (queryExt as jest.Mock).mockImplementation(() => []);
    (query as jest.Mock).mockImplementation(() => []);
  });

  afterEach(() => {});

  describe('validate', () => {
    it('should generate a new UUID for create method if propertyId is missing', () => {
      const obj = {} as KeyPointsDetails;
      (repository as any).validate('create', obj);
      expect(obj.propertyId).toBeDefined();
    });

    it('should throw ValidationError for update method if propertyId is missing', () => {
      const obj = {} as KeyPointsDetails;
      expect(() => (repository as any).validate('update', obj)).toThrow(
        ValidationError,
      );
    });

    it('should not modify the object for other methods', () => {
      const obj = { propertyId: 'test-id' } as KeyPointsDetails;
      (query as jest.Mock).mockReturnValue({
        propertyId: 'test-id',
        policyId: 1,
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
      expect(sqlQuery).toContain('SELECT * FROM key_points_details');
      expect(values).toEqual([]);
      expect(sqlCountQuery).toContain(
        'SELECT COUNT(*) as records FROM key_points_details',
      );
    });
  });

  describe('getQueryProperties', () => {
    it('should return the correct SQL query and parameters for a given recordId', () => {
      const recordId = 'test-id';
      const [sqlQuery, values] = (repository as any).getQueryProperties(
        recordId,
      );
      expect(sqlQuery).toContain('SELECT * FROM key_points_details');
      expect(values).toEqual([recordId]);
    });
  });

  describe('getCreateQueryProperties', () => {
    it('should return the correct SQL query and parameters for a given KeyPointsDetails object', () => {
      const obj: KeyPointsDetails = {
        propertyId: 'test-id',
        policyId: 1,
        documentId: 4,
        createdOn: new Date(),
        value: 'test-value',
      };
      const [sqlQuery, values] = (repository as any).getCreateQueryProperties(
        obj,
      );
      expect(sqlQuery).toContain('INSERT INTO document_property');
      expect(values).toEqual([
        obj.value,
        obj.propertyId,
        obj.documentId,
        obj.policyId,
      ]);
    });
  });

  describe('updateQueryProperties', () => {
    it('should return the correct SQL query and parameters for a given KeyPointsDetails object', () => {
      const obj: KeyPointsDetails = {
        propertyId: 'test-id',
        policyId: 1,
      } as KeyPointsDetails;
      const [fieldMap] = (repository as any).getUpdateQueryProperties(obj);
      expect(fieldMap).toEqual({
        policy_id: obj.policyId,
      });
    });
  });
});
