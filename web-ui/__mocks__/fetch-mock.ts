export const mockFetch = (response: any, status: number = 200) => {
  global.fetch = jest.fn().mockImplementation(() =>
    Promise.resolve({
      ok: status >= 200 && status < 300,
      status,
      json: () => Promise.resolve(response),
    })
  );
};

export const mockFetchError = (error: any) => {
  global.fetch = jest.fn().mockImplementation(() => Promise.reject(error));
};
