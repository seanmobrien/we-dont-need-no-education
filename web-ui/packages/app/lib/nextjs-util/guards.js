export const isRequestOrApiRequest = (req) => typeof req === 'object' &&
    !!req &&
    'body' in req &&
    typeof req.body === 'object' &&
    'method' in req &&
    typeof req.method === 'string';
export const isNextApiRequest = (req) => isRequestOrApiRequest(req) &&
    'cookies' in req &&
    typeof req.cookies === 'object' &&
    'query' in req &&
    typeof req.query === 'object';
export const isNextRequest = (req) => isRequestOrApiRequest(req) &&
    'headers' in req &&
    typeof req.headers === 'object' &&
    'nextUrl' in req &&
    typeof req.nextUrl === 'object';
export const isLikeNextRequest = (req) => isNextRequest(req) || isNextApiRequest(req);
export const isLikeNextResponse = (res) => typeof res === 'object' &&
    !!res &&
    'status' in res &&
    typeof res.status === 'function';
export const isNextApiResponse = (res) => isLikeNextResponse(res) &&
    'json' in res &&
    typeof res.json === 'function' &&
    'getHeader' in res &&
    typeof res.getHeader === 'function';
export const isNextResponse = (res) => isLikeNextResponse(res) &&
    'cookies' in res &&
    typeof res.cookies === 'object';
//# sourceMappingURL=guards.js.map