export const decodeJwt = jest.fn((token) => {
    const parts = token.split('.');
    if (parts.length !== 3) {
        throw new Error('Invalid JWT format');
    }
    const payload = parts[1];
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = Buffer.from(base64, 'base64').toString('utf-8');
    return JSON.parse(decoded);
});
export const jwtVerify = jest.fn(async (token) => {
    const payload = decodeJwt(token);
    return { payload };
});
export const createRemoteJWKSet = jest.fn((url) => {
    return { url: url.toString() };
});
//# sourceMappingURL=jose.js.map