 
/**
 * @jest-environment node
 */
jest.mock('@compliance-theater/database/driver');

import { KeyPointsDetailsRepository } from '@/lib/api/email/properties/key-points/key-points-details-repository';
import { ValidationError } from '@/lib/react-util/errors/validation-error';
import { query, queryExt } from '@compliance-theater/database/driver';
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
      expect(sqlQuery).toContain(
        'SELECT ep.*, ept.property_name, epc.description, epc.email_property_category_id',
      );
      expect(values).toEqual([recordId]);
    });
  });

  describe('getCreateQueryProperties', () => {
    it('should return the correct SQL query and parameters for a given KeyPointsDetails object', () => {
      const obj: KeyPointsDetails = {
        propertyId: 'test-id',
        documentId: 4,
        createdOn: new Date(),
        value: 'test-value',
        relevance: null,
        compliance: null,
        severity: null,
        inferred: false,
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
        null, // policy_basis
        null, // tags
        obj.relevance,
        obj.compliance,
        obj.severity,
        obj.inferred,
      ]);
    });
  });
});
