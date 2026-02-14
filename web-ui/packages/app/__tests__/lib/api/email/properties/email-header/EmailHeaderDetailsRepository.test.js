jest.mock('@compliance-theater/database/driver');
import { EmailHeaderDetailsRepository } from '@/lib/api/email/properties/email-headers/email-header-details-repository';
import { ValidationError } from '@/lib/react-util/errors/validation-error';
import { query, queryExt } from '@compliance-theater/database/driver';
describe('EmailHeaderDetailsRepository', () => {
    let repository;
    beforeEach(() => {
        repository = new EmailHeaderDetailsRepository();
        queryExt.mockImplementation(() => []);
        query.mockImplementation(() => []);
    });
    afterEach(() => {
    });
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
            repository.validate('delete', obj);
            expect(obj.propertyId).toBe('test-id');
        });
    });
    describe('getListQueryProperties', () => {
        it('should return the correct SQL query and parameters', () => {
            const [sqlQuery, values, sqlCountQuery] = repository.getListQueryProperties();
            expect(sqlQuery).toContain('SELECT ep.*, ept.property_name');
            expect(values).toEqual([]);
            expect(sqlCountQuery).toContain('SELECT COUNT(*) as records');
        });
    });
    describe('getQueryProperties', () => {
        it('should return the correct SQL query and parameters for a given recordId', () => {
            const recordId = 'test-id';
            const [sqlQuery, values] = repository.getQueryProperties(recordId);
            expect(sqlQuery).toContain('SELECT ep.*, ept.property_name');
            expect(values).toEqual([recordId]);
        });
    });
    describe('getCreateQueryProperties', () => {
        it('should return the correct SQL query and parameters for a given EmailProperty object', () => {
            const obj = {
                propertyId: 'test-id',
                typeId: 1,
                documentId: 3,
                createdOn: new Date(),
                value: 'test-value',
            };
            const [sqlQuery, values] = repository.getCreateQueryProperties(obj);
            expect(sqlQuery).toContain('INSERT INTO document_property');
            expect(values).toEqual([
                obj.value,
                obj.typeId,
                obj.propertyId,
                obj.documentId,
                obj.createdOn,
                null,
                null,
            ]);
        });
    });
    describe('getUpdateQueryProperties', () => {
        it('should return the correct SQL query and parameters for a given EmailProperty object', () => {
            const obj = {
                propertyId: 'test-id',
                value: 'updated-value',
            };
            const [fieldMap] = repository.getUpdateQueryProperties(obj);
            expect(fieldMap).toEqual({
                property_value: obj.value,
                policy_basis: null,
                tags: null,
            });
        });
    });
});
//# sourceMappingURL=EmailHeaderDetailsRepository.test.js.map