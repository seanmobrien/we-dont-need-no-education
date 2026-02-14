import { UrlFilteredLogExporter } from '@/instrument/url-filter/url-filtered-log-exporter';
class CaptureLogExporter {
    captured = [];
    exportCalls = 0;
    export(records, resultCallback) {
        this.captured = records;
        this.exportCalls++;
        resultCallback({ code: 0 });
    }
    async shutdown() {
    }
    reset() {
        this.captured = [];
        this.exportCalls = 0;
    }
}
function makeRecord(attrs, body) {
    const rec = {
        attributes: attrs,
        body,
    };
    return rec;
}
describe('UrlFilteredLogExporter', () => {
    let innerExporter;
    beforeEach(() => {
        innerExporter = new CaptureLogExporter();
    });
    afterEach(() => {
        innerExporter.reset();
    });
    describe('Basic Filtering', () => {
        it('should export logs that do not match filter rules', (done) => {
            const exporter = new UrlFilteredLogExporter(innerExporter, {
                rules: ['/api/auth'],
            });
            const record = makeRecord({ 'http.url': '/api/public' }, 'Public API request');
            exporter.export([record], (result) => {
                expect(innerExporter.captured.length).toBe(1);
                expect(innerExporter.captured[0]).toBe(record);
                done();
            });
        });
        it('should filter logs that match string pattern in attributes', (done) => {
            const exporter = new UrlFilteredLogExporter(innerExporter, {
                rules: ['/api/auth'],
            });
            const record = makeRecord({ 'http.url': '/api/auth/login' }, 'Login request');
            exporter.export([record], (result) => {
                expect(innerExporter.captured.length).toBe(0);
                done();
            });
        });
        it('should filter logs that match pattern in body', (done) => {
            const exporter = new UrlFilteredLogExporter(innerExporter, {
                rules: ['/api/auth'],
            });
            const record = makeRecord({}, 'Request to /api/auth/login');
            exporter.export([record], (result) => {
                expect(innerExporter.captured.length).toBe(0);
                done();
            });
        });
        it('should filter logs that match regex pattern', (done) => {
            const exporter = new UrlFilteredLogExporter(innerExporter, {
                rules: [/\/admin\//],
            });
            const record = makeRecord({ 'http.url': '/admin/users/delete' }, 'Admin action');
            exporter.export([record], (result) => {
                expect(innerExporter.captured.length).toBe(0);
                done();
            });
        });
        it('should filter logs matching any of multiple rules', (done) => {
            const exporter = new UrlFilteredLogExporter(innerExporter, {
                rules: ['/api/auth', '/health', /\/admin\//],
            });
            const record1 = makeRecord({ 'http.url': '/api/public' }, 'Public');
            const record2 = makeRecord({ 'http.url': '/api/auth/login' }, 'Auth');
            const record3 = makeRecord({ 'http.url': '/health' }, 'Health check');
            const record4 = makeRecord({ 'http.url': '/admin/users' }, 'Admin');
            const record5 = makeRecord({ 'http.url': '/api/data' }, 'Data');
            exporter.export([record1, record2, record3, record4, record5], (result) => {
                expect(innerExporter.captured.length).toBe(2);
                expect(innerExporter.captured[0]).toBe(record1);
                expect(innerExporter.captured[1]).toBe(record5);
                done();
            });
        });
        it('should handle UrlFilterRuleOptions format', (done) => {
            const exporter = new UrlFilteredLogExporter(innerExporter, {
                rules: [{ pattern: '/api/secret' }],
            });
            const record1 = makeRecord({ 'http.url': '/api/public' }, 'Public');
            const record2 = makeRecord({ 'http.url': '/api/secret/key' }, 'Secret');
            exporter.export([record1, record2], (result) => {
                expect(innerExporter.captured.length).toBe(1);
                expect(innerExporter.captured[0]).toBe(record1);
                done();
            });
        });
    });
    describe('Body Filtering', () => {
        it('should filter logs with URLs in string body', (done) => {
            const exporter = new UrlFilteredLogExporter(innerExporter, {
                rules: ['/api/auth'],
            });
            const record = makeRecord({}, 'Error accessing /api/auth/reset-password');
            exporter.export([record], (result) => {
                expect(innerExporter.captured.length).toBe(0);
                done();
            });
        });
        it('should handle numeric body gracefully', (done) => {
            const exporter = new UrlFilteredLogExporter(innerExporter, {
                rules: ['/api/auth'],
            });
            const record = makeRecord({ 'http.url': '/api/public' }, 12345);
            exporter.export([record], (result) => {
                expect(innerExporter.captured.length).toBe(1);
                done();
            });
        });
        it('should handle boolean body gracefully', (done) => {
            const exporter = new UrlFilteredLogExporter(innerExporter, {
                rules: ['/api/auth'],
            });
            const record = makeRecord({ 'http.url': '/api/public' }, true);
            exporter.export([record], (result) => {
                expect(innerExporter.captured.length).toBe(1);
                done();
            });
        });
        it('should handle object body with nested URLs', (done) => {
            const exporter = new UrlFilteredLogExporter(innerExporter, {
                rules: ['/api/auth'],
            });
            const record = makeRecord({}, {
                message: 'Request failed',
                url: '/api/auth/login',
            });
            exporter.export([record], (result) => {
                expect(innerExporter.captured.length).toBe(0);
                done();
            });
        });
        it('should handle undefined body', (done) => {
            const exporter = new UrlFilteredLogExporter(innerExporter, {
                rules: ['/api/auth'],
            });
            const record = makeRecord({ 'http.url': '/api/public' });
            exporter.export([record], (result) => {
                expect(innerExporter.captured.length).toBe(1);
                done();
            });
        });
    });
    describe('Attribute Filtering', () => {
        it('should check common HTTP URL attribute keys', (done) => {
            const exporter = new UrlFilteredLogExporter(innerExporter, {
                rules: ['/api/auth'],
            });
            const record1 = makeRecord({ 'http.url': '/api/auth/login' }, '');
            const record2 = makeRecord({ url: '/api/auth/register' }, '');
            const record3 = makeRecord({ 'request.url': '/api/auth/reset' }, '');
            const record4 = makeRecord({ endpoint: '/api/auth/verify' }, '');
            exporter.export([record1, record2, record3, record4], (result) => {
                expect(innerExporter.captured.length).toBe(0);
                done();
            });
        });
        it('should extract URLs from nested attribute objects', (done) => {
            const exporter = new UrlFilteredLogExporter(innerExporter, {
                rules: ['/api/auth'],
            });
            const record = makeRecord({
                request: {
                    'http.url': '/api/auth/login',
                },
            }, '');
            exporter.export([record], (result) => {
                expect(innerExporter.captured.length).toBe(0);
                done();
            });
        });
        it('should extract URLs from array attributes', (done) => {
            const exporter = new UrlFilteredLogExporter(innerExporter, {
                rules: ['/api/auth'],
            });
            const record = makeRecord({
                urls: ['/api/public', '/api/auth/login'],
            }, '');
            exporter.export([record], (result) => {
                expect(innerExporter.captured.length).toBe(0);
                done();
            });
        });
        it('should handle empty attributes', (done) => {
            const exporter = new UrlFilteredLogExporter(innerExporter, {
                rules: ['/api/auth'],
            });
            const record = makeRecord({}, 'Log message without URLs');
            exporter.export([record], (result) => {
                expect(innerExporter.captured.length).toBe(1);
                done();
            });
        });
    });
    describe('Error Handling', () => {
        it('should keep log if individual filter evaluation fails', (done) => {
            const exporter = new UrlFilteredLogExporter(innerExporter, {
                rules: ['/api/auth'],
            });
            const malformedRecord = {
                get attributes() {
                    throw new Error('Attribute access error');
                },
                body: 'test',
            };
            exporter.export([malformedRecord], (result) => {
                expect(innerExporter.captured.length).toBe(1);
                done();
            });
        });
        it('should export all logs if filtering completely fails', (done) => {
            const brokenExporter = new UrlFilteredLogExporter(innerExporter, {
                rules: ['/api/auth'],
            });
            brokenExporter.matches = () => {
                throw new Error('Matches failed');
            };
            const record1 = makeRecord({ 'http.url': '/api/auth' }, '');
            const record2 = makeRecord({ 'http.url': '/api/public' }, '');
            brokenExporter.export([record1, record2], (result) => {
                expect(innerExporter.captured.length).toBe(2);
                done();
            });
        });
        it('should handle empty record array', (done) => {
            const exporter = new UrlFilteredLogExporter(innerExporter, {
                rules: ['/api/auth'],
            });
            exporter.export([], (result) => {
                expect(innerExporter.captured.length).toBe(0);
                expect(innerExporter.exportCalls).toBe(1);
                done();
            });
        });
        it('should handle null body gracefully', (done) => {
            const exporter = new UrlFilteredLogExporter(innerExporter, {
                rules: ['/api/auth'],
            });
            const record = {
                attributes: { 'http.url': '/api/public' },
                body: null,
            };
            exporter.export([record], (result) => {
                expect(innerExporter.captured.length).toBe(1);
                done();
            });
        });
    });
    describe('Mixed Scenarios', () => {
        it('should filter based on body OR attributes match', (done) => {
            const exporter = new UrlFilteredLogExporter(innerExporter, {
                rules: ['/api/auth', '/health'],
            });
            const record1 = makeRecord({ 'http.url': '/api/auth/login' }, 'Some message');
            const record2 = makeRecord({ 'http.url': '/api/public' }, 'Health check at /health');
            const record3 = makeRecord({ 'http.url': '/api/public' }, 'Normal log');
            exporter.export([record1, record2, record3], (result) => {
                expect(innerExporter.captured.length).toBe(1);
                expect(innerExporter.captured[0]).toBe(record3);
                done();
            });
        });
        it('should handle complex real-world log records', (done) => {
            const exporter = new UrlFilteredLogExporter(innerExporter, {
                rules: ['/api/auth', /\/admin\//, '/metrics'],
            });
            const publicLog = makeRecord({
                'http.url': '/api/users/list',
                'http.method': 'GET',
                'http.status_code': 200,
            }, 'Fetched user list');
            const authLog = makeRecord({
                'http.url': '/api/auth/login',
                'http.method': 'POST',
                'http.status_code': 200,
            }, 'User logged in successfully');
            const adminLog = makeRecord({
                'http.url': '/admin/users/delete',
                'http.method': 'DELETE',
            }, 'Admin deleted user');
            const metricsLog = makeRecord({ endpoint: '/metrics' }, 'Metrics endpoint hit');
            const dataLog = makeRecord({
                'http.url': '/api/data/export',
                'http.method': 'POST',
            }, 'Exporting data');
            exporter.export([publicLog, authLog, adminLog, metricsLog, dataLog], (result) => {
                expect(innerExporter.captured.length).toBe(2);
                expect(innerExporter.captured[0]).toBe(publicLog);
                expect(innerExporter.captured[1]).toBe(dataLog);
                done();
            });
        });
        it('should be case-insensitive for string patterns', (done) => {
            const exporter = new UrlFilteredLogExporter(innerExporter, {
                rules: ['/api/AUTH'],
            });
            const record = makeRecord({ 'http.url': '/api/auth/login' }, 'Login');
            exporter.export([record], (result) => {
                expect(innerExporter.captured.length).toBe(0);
                done();
            });
        });
        it('should match partial URLs correctly', (done) => {
            const exporter = new UrlFilteredLogExporter(innerExporter, {
                rules: ['/auth'],
            });
            const record1 = makeRecord({ url: '/api/auth/login' }, '');
            const record2 = makeRecord({ url: '/authentication/verify' }, '');
            const record3 = makeRecord({ url: '/public/data' }, '');
            exporter.export([record1, record2, record3], (result) => {
                expect(innerExporter.captured.length).toBe(1);
                expect(innerExporter.captured[0]).toBe(record3);
                done();
            });
        });
    });
    describe('Performance', () => {
        it('should handle large batches efficiently', (done) => {
            const exporter = new UrlFilteredLogExporter(innerExporter, {
                rules: ['/api/auth', '/health'],
            });
            const records = [];
            for (let i = 0; i < 1000; i++) {
                const shouldFilter = i % 3 === 0;
                records.push(makeRecord({
                    'http.url': shouldFilter ? '/api/auth/login' : `/api/data/${i}`,
                }, `Log ${i}`));
            }
            const startTime = Date.now();
            exporter.export(records, (result) => {
                const duration = Date.now() - startTime;
                expect(duration).toBeLessThan(1000);
                const expectedKept = Math.floor((records.length * 2) / 3);
                expect(innerExporter.captured.length).toBeGreaterThanOrEqual(expectedKept - 1);
                expect(innerExporter.captured.length).toBeLessThanOrEqual(expectedKept + 1);
                done();
            });
        });
        it('should leverage cache for repeated URL extraction', (done) => {
            const exporter = new UrlFilteredLogExporter(innerExporter, {
                rules: ['/api/auth'],
            });
            const records = [];
            for (let i = 0; i < 100; i++) {
                records.push(makeRecord({}, 'Request to /api/public/data'));
            }
            exporter.export(records, (result) => {
                expect(innerExporter.captured.length).toBe(100);
                done();
            });
        });
    });
    describe('Shutdown', () => {
        it('should delegate shutdown to inner exporter', async () => {
            const mockShutdown = jest.fn().mockResolvedValue(undefined);
            const mockInner = {
                export: jest.fn(),
                shutdown: mockShutdown,
            };
            const exporter = new UrlFilteredLogExporter(mockInner, {
                rules: ['/api/auth'],
            });
            await exporter.shutdown();
            expect(mockShutdown).toHaveBeenCalled();
        });
        it('should handle inner exporter without shutdown method', async () => {
            const mockInner = {
                export: jest.fn(),
            };
            const exporter = new UrlFilteredLogExporter(mockInner, {
                rules: ['/api/auth'],
            });
            await expect(exporter.shutdown()).resolves.toBeUndefined();
        });
    });
    describe('Integration with UrlFilterEngine', () => {
        it('should inherit URL extraction capabilities', (done) => {
            const exporter = new UrlFilteredLogExporter(innerExporter, {
                rules: ['/api/auth'],
            });
            const record = makeRecord({
                nested: {
                    deep: {
                        url: '/api/auth/login',
                    },
                },
            }, '');
            exporter.export([record], (result) => {
                expect(innerExporter.captured.length).toBe(0);
                done();
            });
        });
        it('should extract from deeply nested structures', (done) => {
            const exporter = new UrlFilteredLogExporter(innerExporter, {
                rules: ['/api/secret'],
            });
            const record = makeRecord({
                level1: {
                    level2: {
                        level3: {
                            url: '/api/secret/data',
                        },
                    },
                },
            }, '');
            exporter.export([record], (result) => {
                expect(innerExporter.captured.length).toBe(0);
                done();
            });
        });
    });
});
//# sourceMappingURL=UrlFilteredLogExporter.test.js.map