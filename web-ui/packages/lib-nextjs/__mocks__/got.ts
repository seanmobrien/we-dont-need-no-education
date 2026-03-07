type MockGotResponse = {
    statusCode: number;
    headers: Record<string, string>;
    body: Buffer;
    rawBody: Buffer;
};

type MockGot = ((..._args: unknown[]) => Promise<MockGotResponse>) & {
    get: (..._args: unknown[]) => Promise<MockGotResponse>;
    post: (..._args: unknown[]) => Promise<MockGotResponse>;
    stream: (..._args: unknown[]) => {
        on: () => void;
        pipe: () => void;
    };
    extend: () => MockGot;
};

const makeResponse = (): MockGotResponse => ({
    statusCode: 200,
    headers: { 'content-type': 'application/json' },
    body: Buffer.from('{"ok":true}'),
    rawBody: Buffer.from('{"ok":true}'),
});

const mockGot = (async () => makeResponse()) as MockGot;

mockGot.get = async () => makeResponse();
mockGot.post = async () => makeResponse();
mockGot.stream = () => ({
    on: () => undefined,
    pipe: () => undefined,
});
mockGot.extend = () => mockGot;

export default mockGot;
export { mockGot as got };
