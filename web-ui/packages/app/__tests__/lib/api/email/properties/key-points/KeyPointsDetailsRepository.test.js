jest.mock('@compliance-theater/database/driver');
import { KeyPointsDetailsRepository } from '@/lib/api/email/properties/key-points/key-points-details-repository';
import { ValidationError } from '@/lib/react-util/errors/validation-error';
import { query, queryExt } from '@compliance-theater/database/driver';
describe('KeyPointsDetailsRepository', () => {
    let repository;
    beforeEach(() => {
        repository = new KeyPointsDetailsRepository();
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
                policyId: 1,
            });
            repository.validate('update', obj);
            expect(obj.propertyId).toBe('test-id');
        });
    });
    describe('getListQueryProperties', () => {
        it('should return the correct SQL query and parameters', () => {
            const [sqlQuery, values, sqlCountQuery] = repository.getListQueryProperties();
            expect(sqlQuery).toContain('SELECT * FROM key_points_details');
            expect(values).toEqual([]);
            expect(sqlCountQuery).toContain('SELECT COUNT(*) as records FROM key_points_details');
        });
    });
    describe('getQueryProperties', () => {
        it('should return the correct SQL query and parameters for a given recordId', () => {
            const recordId = 'test-id';
            const [sqlQuery, values] = repository.getQueryProperties(recordId);
            expect(sqlQuery).toContain('SELECT ep.*, ept.property_name, epc.description, epc.email_property_category_id');
            expect(values).toEqual([recordId]);
        });
    });
    describe('getCreateQueryProperties', () => {
        it('should return the correct SQL query and parameters for a given KeyPointsDetails object', () => {
            const obj = {
                propertyId: 'test-id',
                documentId: 4,
                createdOn: new Date(),
                value: 'test-value',
                relevance: null,
                compliance: null,
                severity: null,
                inferred: false,
            };
            const [sqlQuery, values] = repository.getCreateQueryProperties(obj);
            expect(sqlQuery).toContain('INSERT INTO document_property');
            expect(values).toEqual([
                obj.value,
                obj.propertyId,
                obj.documentId,
                obj.createdOn,
                null,
                null,
                obj.relevance,
                obj.compliance,
                obj.severity,
                obj.inferred,
            ]);
        });
    });
});
//# sourceMappingURL=KeyPointsDetailsRepository.test.js.map