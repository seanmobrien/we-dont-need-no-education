export const mockFetch = (response, status = 200) => {
    global.fetch = jest.fn().mockImplementation(() => Promise.resolve({
        ok: status >= 200 && status < 300,
        status,
        json: () => Promise.resolve(response),
    }));
};
export const mockFetchError = (error) => {
    global.fetch = jest.fn().mockImplementation(() => Promise.reject(error));
};
//# sourceMappingURL=fetch-mock.js.map