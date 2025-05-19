/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * @jest-environment node
 */
jest.mock('@/lib/neondb');

import { EmailHeaderDetailsRepository } from '@/lib/api/email/properties/email-headers/email-header-details-repository';
import { ValidationError } from '@/lib/react-util';
import { query, queryExt } from '@/lib/neondb';
import { EmailProperty } from '@/data-models/api';

describe('EmailHeaderDetailsRepository', () => {
  let repository: EmailHeaderDetailsRepository;

  beforeEach(() => {
    repository = new EmailHeaderDetailsRepository();
    (queryExt as jest.Mock).mockImplementation(() => []);
    (query as jest.Mock).mockImplementation(() => []);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validate', () => {
    it('should generate a new UUID for create method if propertyId is missing', () => {
      const obj = {} as EmailProperty;
      (repository as any).validate('create', obj);
      expect(obj.propertyId).toBeDefined();
    });

    it('should throw ValidationError for update method if propertyId is missing', () => {
      const obj = {} as EmailProperty;
      expect(() => (repository as any).validate('update', obj)).toThrow(
        ValidationError,
      );
    });

    it('should not modify the object for other methods', () => {
      const obj = { propertyId: 'test-id' } as EmailProperty;
      (repository as any).validate('delete', obj);
      expect(obj.propertyId).toBe('test-id');
    });
  });

  describe('getListQueryProperties', () => {
    it('should return the correct SQL query and parameters', () => {
      const [sqlQuery, values, sqlCountQuery] = (
        repository as any
      ).getListQueryProperties();
      expect(sqlQuery).toContain('SELECT ep.*, ept.property_name');
      expect(values).toEqual([]);
      expect(sqlCountQuery).toContain('SELECT COUNT(*) as records');
    });
  });

  describe('getQueryProperties', () => {
    it('should return the correct SQL query and parameters for a given recordId', () => {
      const recordId = 'test-id';
      const [sqlQuery, values] = (repository as any).getQueryProperties(
        recordId,
      );
      expect(sqlQuery).toContain('SELECT ep.*, ept.property_name');
      expect(values).toEqual([recordId]);
    });
  });

  describe('getCreateQueryProperties', () => {
    it('should return the correct SQL query and parameters for a given EmailProperty object', () => {
      const obj: EmailProperty = {
        propertyId: 'test-id',
        typeId: 1,
        documentId: 3,
        createdOn: new Date(),
        value: 'test-value',
      };
      const [sqlQuery, values] = (repository as any).getCreateQueryProperties(
        obj,
      );
      expect(sqlQuery).toContain('INSERT INTO document_property');
      expect(values).toEqual([
        obj.value,
        obj.typeId,
        obj.propertyId,
        obj.documentId,
        obj.createdOn,
      ]);
    });
  });

  describe('getUpdateQueryProperties', () => {
    it('should return the correct SQL query and parameters for a given EmailProperty object', () => {
      const obj: EmailProperty = {
        propertyId: 'test-id',
        value: 'updated-value',
      } as EmailProperty;
      const [fieldMap] = (repository as any).getUpdateQueryProperties(obj);
      expect(fieldMap).toEqual({
        property_value: obj.value,
      });
    });
  });
});
