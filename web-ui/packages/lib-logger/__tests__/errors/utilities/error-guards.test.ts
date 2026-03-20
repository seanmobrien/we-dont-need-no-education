import {
  isError,
  isXmlHttpRequest,
  isProgressEvent,
  isAbortError,
} from '../../../src/errors/utilities/error-guards';

// Helper: create a duck-typed XHR object
const makeXhr = () => ({
  readyState: 4,
  status: 200,
  timeout: 0,
  upload: {},
  response: null,
  open: jest.fn(),
  send: jest.fn(),
});

// Helper: create a duck-typed ProgressEvent
const makeProgressEvent = (target = makeXhr()) => ({
  target,
  loaded: 100,
  total: 200,
  lengthComputable: true,
});

describe('isError', () => {
  it('returns true for Error instances', () => {
    expect(isError(new Error('oops'))).toBe(true);
  });

  it('returns true for duck-typed error objects with message and name', () => {
    expect(isError({ message: 'oh no', name: 'MyError' })).toBe(true);
  });

  it('returns false for null', () => {
    expect(isError(null)).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isError(undefined)).toBe(false);
  });

  it('returns false for a string', () => {
    expect(isError('error string')).toBe(false);
  });

  it('returns false for a number', () => {
    expect(isError(42)).toBe(false);
  });

  it('returns false for an object with only message', () => {
    expect(isError({ message: 'only message' })).toBe(false);
  });

  it('returns false for an empty object', () => {
    expect(isError({})).toBe(false);
  });

  it('returns false for false', () => {
    expect(isError(false)).toBe(false);
  });
});

describe('isXmlHttpRequest', () => {
  it('returns true for a fully duck-typed XHR', () => {
    expect(isXmlHttpRequest(makeXhr())).toBe(true);
  });

  it('returns false for null', () => {
    expect(isXmlHttpRequest(null)).toBe(false);
  });

  it('returns false for a plain empty object', () => {
    expect(isXmlHttpRequest({})).toBe(false);
  });

  it('returns false when open is not a function', () => {
    const xhr = { ...makeXhr(), open: 'not-a-function' };
    expect(isXmlHttpRequest(xhr)).toBe(false);
  });

  it('returns false when send is not a function', () => {
    const xhr = { ...makeXhr(), send: 'not-a-function' };
    expect(isXmlHttpRequest(xhr)).toBe(false);
  });

  it('returns false when readyState is missing', () => {
    const { readyState, ...noReadyState } = makeXhr();
    void readyState;
    expect(isXmlHttpRequest(noReadyState)).toBe(false);
  });

  it('returns false when status is missing', () => {
    const { status, ...noStatus } = makeXhr();
    void status;
    expect(isXmlHttpRequest(noStatus)).toBe(false);
  });

  it('returns false for a string', () => {
    expect(isXmlHttpRequest('xhr')).toBe(false);
  });
});

describe('isProgressEvent', () => {
  it('returns true for a fully duck-typed ProgressEvent', () => {
    expect(isProgressEvent(makeProgressEvent())).toBe(true);
  });

  it('returns false for null', () => {
    expect(isProgressEvent(null)).toBe(false);
  });

  it('returns false for an empty object', () => {
    expect(isProgressEvent({})).toBe(false);
  });

  it('returns false when target is not an XHR', () => {
    expect(isProgressEvent({ target: {}, loaded: 0, total: 100, lengthComputable: true })).toBe(false);
  });

  it('returns false when loaded is not a number', () => {
    const event = { ...makeProgressEvent(), loaded: 'not-a-number' };
    expect(isProgressEvent(event)).toBe(false);
  });

  it('returns false when total is not a number', () => {
    const event = { ...makeProgressEvent(), total: '200' };
    expect(isProgressEvent(event)).toBe(false);
  });

  it('returns false when lengthComputable is not a boolean', () => {
    const event = { ...makeProgressEvent(), lengthComputable: 1 };
    expect(isProgressEvent(event)).toBe(false);
  });

  it('returns false when target is missing', () => {
    const { target, ...noTarget } = makeProgressEvent();
    void target;
    expect(isProgressEvent(noTarget)).toBe(false);
  });

  it('returns false for a string', () => {
    expect(isProgressEvent('event')).toBe(false);
  });
});

describe('isAbortError', () => {
  it('returns true for a DOMException with name AbortError', () => {
    const domException = new DOMException('aborted', 'AbortError');
    expect(isAbortError(domException)).toBe(true);
  });

  it('returns false for a DOMException with a different name', () => {
    const domException = new DOMException('other error', 'NotFoundError');
    expect(isAbortError(domException)).toBe(false);
  });

  it('returns false for a plain Error named AbortError', () => {
    const err = new Error('aborted');
    err.name = 'AbortError';
    expect(isAbortError(err)).toBe(false);
  });

  it('returns false for null', () => {
    expect(isAbortError(null)).toBe(false);
  });

  it('returns false for a string', () => {
    expect(isAbortError('AbortError')).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isAbortError(undefined)).toBe(false);
  });
});
