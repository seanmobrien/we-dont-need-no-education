jest.unmock('@opentelemetry/api');
jest.unmock('@opentelemetry/sdk-trace-base');
jest.mock('@compliance-theater/database/driver');
jest.mock('@compliance-theater/database/schema', () => ({}));
jest.mock('google-auth-library');
jest.mock('googleapis');
jest.mock('@compliance-theater/send-api-request');
jest.mock('@/lib/api/email/import/google');
jest.mock('@/lib/email/import/google/managermapfactory');
import { DefaultImportManager } from '@/lib/email/import/importmanager';
import { ImportStageValues, } from '@/data-models/api/import/email-message';
import { loadEmail } from '@/lib/api/email/import/google';
import { LoggedError } from '@compliance-theater/logger';
import { query, queryExt } from '@compliance-theater/database/driver';
import { managerMapFactory } from '@/lib/email/import/google/managermapfactory';
import { hideConsoleOutput } from '@/__tests__/test-utils-server';
const mockManagerMapFactory = managerMapFactory;
const mockLoadEmail = loadEmail;
const mockStateManager = {
    begin: jest.fn((ctx) => Promise.resolve(ctx)),
    run: jest.fn((ctx) => {
        return {
            target: loadEmail(ctx.id, { req: ctx.req }),
        };
    }),
    commit: jest.fn((ctx) => {
        return Promise.resolve({
            ...ctx,
            stage: 'completed',
        });
    }),
    rollback: jest.fn(),
};
const consoleSpy = hideConsoleOutput();
describe('DefaultImportManager', () => {
    beforeEach(() => {
        const map = ImportStageValues.reduce((acc, stage) => {
            acc[stage] = jest.fn(() => mockStateManager);
            return acc;
        }, {});
        mockManagerMapFactory.mockReturnValue(map);
    });
    afterEach(() => {
        consoleSpy.dispose();
    });
    const provider = 'google';
    const req = {
        headers: {
            get: jest.fn(),
        },
        json: jest.fn(),
        method: 'GET',
        url: 'http://localhost',
    };
    let manager;
    beforeEach(() => {
        query.mockImplementation(() => Promise.resolve([]));
        queryExt.mockImplementation(() => Promise.resolve({ rowCount: 0, rows: [] }));
        manager = new DefaultImportManager(provider);
    });
    describe('runImportStage', () => {
        it('should run the import stage and return the import source message', async () => {
            const emailId = 'testEmailId';
            const importSourceMessage = {
                id: 'testEmailId',
                stage: 'new',
                providerId: emailId,
                userId: 1,
                raw: {},
            };
            mockLoadEmail.mockResolvedValue(importSourceMessage);
            const result = await manager.runImportStage(importSourceMessage, { req });
            expect(result).toEqual(importSourceMessage);
        });
    });
    describe('importEmail', () => {
        it('should import the email and return success', async () => {
            const emailId = 'testEmailId';
            const importSourceMessage = {
                id: 'testEmailId',
                providerId: emailId,
                stage: 'completed',
                userId: 1,
                raw: {},
            };
            mockLoadEmail.mockResolvedValue(importSourceMessage);
            const result = await manager.importEmail(emailId, { req });
            expect(result).toEqual({
                success: true,
                message: 'Import successful',
                data: importSourceMessage,
            });
        });
        it('should handle errors and return failure', async () => {
            consoleSpy.setup();
            const emailId = 'testEmailId';
            const error = new Error('Test error');
            mockLoadEmail.mockRejectedValue(error);
            const result = await manager.importEmail(emailId, { req });
            expect(result).toEqual({
                success: false,
                message: 'Test error',
                error: expect.any(LoggedError),
            });
        });
    });
});
//# sourceMappingURL=importmanager.test.js.map