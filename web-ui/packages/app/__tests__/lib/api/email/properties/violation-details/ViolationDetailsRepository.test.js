jest.mock('@compliance-theater/database/driver');
import { ViolationDetailsRepository } from '@/lib/api/email/properties/violation-details/violation-details-repository';
import { ValidationError } from '@/lib/react-util/errors/validation-error';
import { query, queryExt } from '@compliance-theater/database/driver';
describe('ViolationDetailsRepository', () => {
    let repository;
    beforeEach(() => {
        repository = new ViolationDetailsRepository();
        queryExt.mockImplementation(() => []);
        query.mockImplementation(() => []);
    });
    afterEach(() => { });
    describe('validate', () => {
        it('should generate a new UUID for create method if propertyId is missing', () => {
            const obj = {};
            repository.validate('create', obj);
            expect(obj.propertyId).toBeDefined();
        });
        it('should throw ValidationError for update method if propertyId is missing', () => {
            const obj = {};
            expect(() => repository.validate('update', obj)).toThrow(ValidationError);
        });
        it('should not modify the object for other methods', () => {
            const obj = { propertyId: 'test-id' };
            query.mockReturnValue({
                propertyId: 'test-id',
                attachmentId: 1,
                keyPointPropertyId: 'key-point-id',
                actionPropertyId: 'action-id',
                violationType: 'test-violation',
                severityLevel: 2,
                detectedBy: 'test-detector',
                detectedOn: new Date(),
            });
            repository.validate('update', obj);
            expect(obj.propertyId).toBe('test-id');
        });
    });
    describe('getListQueryProperties', () => {
        it('should return the correct SQL query and parameters', () => {
            const [sqlQuery, values, sqlCountQuery] = repository.getListQueryProperties();
            expect(sqlQuery).toContain('SELECT * FROM violation_details');
            expect(values).toEqual([]);
            expect(sqlCountQuery).toContain('SELECT COUNT(*) as records FROM violation_details');
        });
    });
    describe('getQueryProperties', () => {
        it('should return the correct SQL query and parameters for a given recordId', () => {
            const recordId = 'test-id';
            const [sqlQuery, values] = repository.getQueryProperties(recordId);
            const normalize = (str) => str.replace(/\s+/g, ' ').trim();
            expect(normalize(sqlQuery)).toContain(normalize(`SELECT ep.*, ept.property_name, epc.description, epc.email_property_category_id,
                vd.attachment_id, vd.key_point_property_id, vd.action_property_id, vd.violation_type, vd.severity_level, vd.detected_by, vd.detected_on
                FROM document_property ep
                 JOIN violation_details vd ON vd.property_id = ep.property_id
                 JOIN email_property_type ept ON ept.document_property_type_id = ep.document_property_type_id
                 JOIN email_property_category epc ON ept.email_property_category_id = epc.email_property_category_id
           WHERE vd.property_id = $1`));
            expect(values).toEqual([recordId]);
        });
    });
    describe('getCreateQueryProperties', () => {
        it('should return the correct SQL query and parameters for a given ViolationDetails object', () => {
            const obj = {
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
            const [sqlQuery, values] = repository.getCreateQueryProperties(obj);
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
            const obj = {
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
            const [fieldMap] = repository.getUpdateQueryProperties(obj);
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
//# sourceMappingURL=ViolationDetailsRepository.test.js.map