/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * @jest-environment node
 */
jest.mock('@/lib/neondb');

import { ViolationDetailsRepository } from '@/lib/api/email/properties/violation-details/violation-details-repository';
import { ValidationError } from '@/lib/react-util/errors/validation-error';
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

      const normalize = (str: string) => str.replace(/\s+/g, ' ').trim();
      expect(normalize(sqlQuery)).toContain(
        normalize(`SELECT ep.*, ept.property_name, epc.description, epc.email_property_category_id,
                vd.attachment_id, vd.key_point_property_id, vd.action_property_id, vd.violation_type, vd.severity_level, vd.detected_by, vd.detected_on
                FROM document_property ep
                 JOIN violation_details vd ON vd.property_id = ep.property_id
                 JOIN email_property_type ept ON ept.document_property_type_id = ep.document_property_type_id
                 JOIN email_property_category epc ON ept.email_property_category_id = epc.email_property_category_id
           WHERE vd.property_id = $1`),
      );
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
        documentId: 1,
        createdOn: new Date(),
        value: 'test-value',
        detectedBy: 'test-detector',
        detectedOn: new Date(),
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
        obj.attachmentId,
        obj.keyPointPropertyId,
        obj.actionPropertyId,
        obj.violationType,
        obj.severityLevel,
        obj.detectedBy,
        obj.detectedOn,
        null,
        null,
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
        documentId: 4,
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
