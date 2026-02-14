import { mockDeep } from 'jest-mock-extended';
const mockOAuth2Client = jest.fn().mockImplementation(() => {
    const ret = mockDeep();
    ret.getAccessToken.mockImplementation((cb) => {
        const token = {
            token: 'mock-access-token',
            res: mockDeep(),
        };
        if (cb) {
            cb(null, token.token);
        }
        return Promise.resolve(token);
    });
    ret.refreshAccessToken.mockImplementation((cb) => {
        const result = {
            credentials: {
                access_token: 'mock-access-token',
                refresh_token: 'mock-refresh-token',
            },
            res: mockDeep(),
        };
        if (cb) {
            cb(null, result.credentials, result.res);
        }
        return Promise.resolve(result);
    });
    return ret;
});
export { mockOAuth2Client as OAuth2Client };
//# sourceMappingURL=google-auth-library.js.map