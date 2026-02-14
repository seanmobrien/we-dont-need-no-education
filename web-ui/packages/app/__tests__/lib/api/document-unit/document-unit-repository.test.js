import { DocumentUnitRepository } from '@/lib/api/document-unit';
import { ValidationError } from '@/lib/react-util/errors/validation-error';
jest.mock('@azure/storage-blob', () => ({
    AccountSASPermissions: { parse: jest.fn(() => ({ toString: () => 'r' })) },
    AccountSASResourceTypes: {
        parse: jest.fn(() => ({ toString: () => 'sco' })),
    },
    AccountSASServices: { parse: jest.fn(() => ({ toString: () => 'b' })) },
    SASProtocol: { Https: 'https' },
    generateAccountSASQueryParameters: jest.fn(() => ({
        toString: () => 'mocked-sas-token',
    })),
    StorageSharedKeyCredential: jest.fn().mockImplementation(() => ({})),
}));
describe('DocumentUnitRepository', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });
    test('SasKey is empty when generateDownloadKey is false', () => {
        const repo = new DocumentUnitRepository();
        const sas = repo.SasKey;
        expect(sas).toBe('');
    });
    test('SasKey is generated when generateDownloadKey is true', () => {
        const repo = new DocumentUnitRepository({ generateDownloadKey: true });
        const sas = repo.SasKey;
        expect(sas).toBe('?mocked-sas-token');
        expect(repo.SasKey).toBe(sas);
    });
    test('mapToDocumentUnitSummary maps fields and builds hrefs correctly', () => {
        const repo = new DocumentUnitRepository();
        const record = {
            unit_id: 42,
            email_id: 'e-1',
            attachment_id: 7,
            email_property_id: 'prop-1',
            thread_id: 9001,
            related_email_ids: ['a', 'b'],
            document_type: 'attachment',
            created_on: new Date().toISOString(),
            parent_email_id: 'p-1',
            embedding_model: 'embed-v1',
            embedded_on: new Date().toISOString(),
            file_path: 'https://files.example.com/file.pdf',
        };
        const mapped = repo.mapToDocumentUnitSummary(record);
        expect(mapped.unitId).toBe(42);
        expect(mapped.emailId).toBe('e-1');
        expect(mapped.attachmentId).toBe(7);
        expect(mapped.emailPropertyId).toBe('prop-1');
        expect(Array.isArray(mapped.relatedEmailIds)).toBe(true);
        expect(mapped.documentType).toBe('attachment');
        expect(mapped.hrefDocument).toBe('https://files.example.com/file.pdf');
        expect(mapped.hrefApi).toContain('/api/attachment/7');
    });
    test('mapToDocumentUnit includes content', () => {
        const repo = new DocumentUnitRepository();
        const record = {
            unit_id: 1,
            created_on: new Date().toISOString(),
            document_type: 'note',
            content: 'hello world',
        };
        const mapped = repo.mapToDocumentUnit(record);
        expect(mapped.content).toBe('hello world');
        expect(mapped.unitId).toBe(1);
    });
    test('getCreateQueryProperties returns SQL and parameters in expected order', () => {
        const repo = new DocumentUnitRepository();
        const model = {
            emailId: 'e1',
            attachmentId: 2,
            emailPropertyId: 'p1',
            content: 'c',
            documentType: 'note',
            embeddingModel: 'm1',
        };
        const [sql, params] = repo.getCreateQueryProperties(model);
        expect(typeof sql).toBe('string');
        expect(params).toEqual(['e1', 2, 'p1', 'c', 'note', 'm1']);
        expect(sql.toLowerCase()).toContain('insert into document_units');
    });
    test('getUpdateQueryProperties returns mapping of fields', () => {
        const repo = new DocumentUnitRepository();
        const model = {
            content: 'x',
            documentType: 'cta',
            embeddingModel: 'e1',
            embeddedOn: new Date('2020-01-01').toISOString(),
        };
        const [obj] = repo.getUpdateQueryProperties(model);
        expect(obj).toHaveProperty('content', 'x');
        expect(obj).toHaveProperty('document_type', 'cta');
        expect(obj).toHaveProperty('embedding_model', 'e1');
        expect(obj).toHaveProperty('embedded_on');
    });
    test('getQueryProperties returns query with parameter placeholder and provided id', async () => {
        const repo = new DocumentUnitRepository();
        const [sql, params] = await repo.getQueryProperties(123);
        expect(sql).toContain('WHERE unit_id = $1');
        expect(params).toEqual([123]);
    });
    test('getListQueryProperties includes pending embed WHERE when configured', async () => {
        const repo = new DocumentUnitRepository({ pendingEmbed: true });
        const [sql, , countSql] = await repo.getListQueryProperties();
        expect(sql).toContain('AND du.embedded_on IS NULL');
        expect(countSql).toContain('FROM document_units du');
        expect(countSql).toContain('du.embedded_on IS NULL');
    });
    test('validate throws on invalid get id (string)', async () => {
        const repo = new DocumentUnitRepository();
        await expect(repo.validate('get', 'not-a-number')).rejects.toThrow(ValidationError);
    });
    test('validate throws on invalid get id (array)', async () => {
        const repo = new DocumentUnitRepository();
        await expect(repo.validate('get', ['nope'])).rejects.toThrow(ValidationError);
    });
    test('validate default branch throws for invalid documentType on update', async () => {
        const repo = new DocumentUnitRepository();
        const bad = { documentType: 'not-a-type' };
        await expect(repo.validate('update', bad)).rejects.toThrow(ValidationError);
    });
});
//# sourceMappingURL=document-unit-repository.test.js.map