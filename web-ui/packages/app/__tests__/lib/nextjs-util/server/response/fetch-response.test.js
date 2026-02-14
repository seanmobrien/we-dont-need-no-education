import { FetchResponse } from '@/lib/nextjs-util/server/response/index';
if (!global.Headers) {
    global.Headers = require('node-fetch').Headers;
}
if (!global.ReadableStream) {
    global.ReadableStream = require('stream/web').ReadableStream;
}
if (!global.TextEncoder) {
    const { TextEncoder, TextDecoder } = require('util');
    global.TextEncoder = TextEncoder;
    global.TextDecoder = TextDecoder;
}
describe('FetchResponse', () => {
    describe('Constructor', () => { });
    describe('Methods', () => {
        it('should return text()', async () => {
            const response = new FetchResponse(Buffer.from('{"foo":"bar"}'));
            expect(await response.text()).toBe('{"foo":"bar"}');
        });
        it('should return json()', async () => {
            const response = new FetchResponse(Buffer.from('{"foo":"bar"}'));
            expect(await response.json()).toEqual({ foo: 'bar' });
        });
    });
});
//# sourceMappingURL=fetch-response.test.js.map