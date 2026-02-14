jest.mock('@compliance-theater/database/driver');
import { ComplianceScoresDetailsRepository } from '@/lib/api/email/properties/compliance-scores/compliance-scores-details-repository';
import { ValidationError } from '@/lib/react-util/errors/validation-error';
import { query, queryExt } from '@compliance-theater/database/driver';
describe('ComplianceScoresDetailsRepository', () => {
    let repository;
    beforeEach(() => {
        repository = new ComplianceScoresDetailsRepository();
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
                actionPropertyId: 'action-id',
                complianceScore: 90,
                violationsFound: 2,
                responseDelayDays: 5,
                overallGrade: 'A',
                evaluatedOn: new Date(),
            });
            repository.validate('update', obj);
            expect(obj.propertyId).toBe('test-id');
        });
    });
    describe('getListQueryProperties', () => {
        it('should return the correct SQL query and parameters', () => {
            const [sqlQuery, values, sqlCountQuery] = repository.getListQueryProperties();
            expect(sqlQuery).toContain('SELECT * FROM compliance_scores_details');
            expect(values).toEqual([]);
            expect(sqlCountQuery).toContain('SELECT COUNT(*) as records FROM compliance_scores_details');
        });
    });
    describe('getQueryProperties', () => {
        it('should return the correct SQL query and parameters for a given recordId', () => {
            const recordId = 'test-id';
            const [sqlQuery, values] = repository.getQueryProperties(recordId);
            expect(sqlQuery).toContain('SELECT ep.*, ept.property_name, epc.description, epc.email_property_category_id,');
            expect(values).toEqual([recordId]);
        });
    });
    describe('getCreateQueryProperties', () => {
        it('should return the correct SQL query and parameters for a given ComplianceScoresDetails object', () => {
            const obj = {
                propertyId: 'test-id',
                actionPropertyId: 'action-id',
                complianceScore: 90,
                violationsFound: 2,
                responseDelayDays: 5,
                overallGrade: 'A',
                evaluatedOn: new Date(),
            };
            const [sqlQuery, values] = repository.getCreateQueryProperties(obj);
            expect(sqlQuery).toContain('INSERT INTO document_property');
            expect(values).toEqual([
                obj.value,
                obj.propertyId,
                obj.documentId,
                values[3],
                obj.actionPropertyId,
                obj.complianceScore,
                obj.violationsFound,
                obj.responseDelayDays,
                obj.overallGrade,
                obj.evaluatedOn,
                null,
                null,
            ]);
        });
    });
    describe('updateQueryProperties', () => {
        it('should return the correct SQL query and parameters for a given ComplianceScoresDetails object', () => {
            const obj = {
                propertyId: 'test-id',
                actionPropertyId: 'action-id',
                complianceScore: 90,
                violationsFound: 2,
                responseDelayDays: 5,
                overallGrade: 'A',
                evaluatedOn: new Date(),
            };
            const [fieldMap] = repository.getUpdateQueryProperties(obj);
            expect(fieldMap).toEqual({
                action_property_id: obj.actionPropertyId,
                compliance_score: obj.complianceScore,
                violations_found: obj.violationsFound,
                response_delay_days: obj.responseDelayDays,
                overall_grade: obj.overallGrade,
                evaluated_on: obj.evaluatedOn,
            });
        });
    });
});
//# sourceMappingURL=ComplianceScoresDetailsRepository.test.js.map