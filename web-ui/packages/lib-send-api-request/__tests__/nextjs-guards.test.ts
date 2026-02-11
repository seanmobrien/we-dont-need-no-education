import { NextRequest } from 'next/server';
import { NextApiRequest, NextApiResponse } from 'next';
import {
  isRequestOrApiRequest,
  isNextApiRequest,
  isNextRequest,
  isLikeNextRequest,
  isLikeNextResponse,
  isNextApiResponse,
  isNextResponse,
} from '../src/nextjs-guards';

describe('nextjs-guards', () => {
  describe('isRequestOrApiRequest', () => {
    it('should return true for valid NextRequest-like object', () => {
      const req = {
        method: 'GET',
        headers: new Headers({ 'content-type': 'application/json' }),
      };
      expect(isRequestOrApiRequest(req)).toBe(true);
    });

    it('should return true for valid NextApiRequest-like object', () => {
      const req = {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: { data: 'test' },
      };
      expect(isRequestOrApiRequest(req)).toBe(true);
    });

    it('should return true even when body is not an object', () => {
      // NextApiRequest body can be string/Buffer for JSON/text bodies
      const req = {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: 'string body',
      };
      expect(isRequestOrApiRequest(req)).toBe(true);
    });

    it('should return false when method is missing', () => {
      const req = {
        headers: {},
      };
      expect(isRequestOrApiRequest(req)).toBe(false);
    });

    it('should return false when headers is missing', () => {
      const req = {
        method: 'GET',
      };
      expect(isRequestOrApiRequest(req)).toBe(false);
    });

    it('should return false for null', () => {
      expect(isRequestOrApiRequest(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isRequestOrApiRequest(undefined)).toBe(false);
    });

    it('should return false for non-object', () => {
      expect(isRequestOrApiRequest('string')).toBe(false);
      expect(isRequestOrApiRequest(123)).toBe(false);
    });
  });

  describe('isNextApiRequest', () => {
    it('should return true for valid NextApiRequest-like object', () => {
      const req = {
        method: 'GET',
        headers: { 'content-type': 'application/json' },
        cookies: { session: 'abc123' },
        query: { id: '123' },
      };
      expect(isNextApiRequest(req)).toBe(true);
    });

    it('should return false when cookies is missing', () => {
      const req = {
        method: 'GET',
        headers: {},
        query: {},
      };
      expect(isNextApiRequest(req)).toBe(false);
    });

    it('should return false when query is missing', () => {
      const req = {
        method: 'GET',
        headers: {},
        cookies: {},
      };
      expect(isNextApiRequest(req)).toBe(false);
    });
  });

  describe('isNextRequest', () => {
    it('should return true for valid NextRequest-like object', () => {
      const req = {
        method: 'GET',
        headers: new Headers(),
        nextUrl: { pathname: '/api/test' },
      };
      expect(isNextRequest(req)).toBe(true);
    });

    it('should return false when nextUrl is missing', () => {
      const req = {
        method: 'GET',
        headers: new Headers(),
      };
      expect(isNextRequest(req)).toBe(false);
    });

    it('should return false for NextApiRequest-like object', () => {
      const req = {
        method: 'GET',
        headers: {},
        cookies: {},
        query: {},
      };
      expect(isNextRequest(req)).toBe(false);
    });
  });

  describe('isLikeNextRequest', () => {
    it('should return true for NextRequest-like object', () => {
      const req = {
        method: 'GET',
        headers: new Headers(),
        nextUrl: { pathname: '/api/test' },
      };
      expect(isLikeNextRequest(req)).toBe(true);
    });

    it('should return true for NextApiRequest-like object', () => {
      const req = {
        method: 'GET',
        headers: {},
        cookies: {},
        query: {},
      };
      expect(isLikeNextRequest(req)).toBe(true);
    });

    it('should return false for invalid object', () => {
      const req = {
        method: 'GET',
        headers: {},
      };
      expect(isLikeNextRequest(req)).toBe(false);
    });
  });

  describe('isLikeNextResponse', () => {
    it('should return true for object with numeric status (NextResponse)', () => {
      const res = {
        status: 200,
      };
      expect(isLikeNextResponse(res)).toBe(true);
    });

    it('should return true for object with function status (NextApiResponse)', () => {
      const res = {
        status: jest.fn(),
      };
      expect(isLikeNextResponse(res)).toBe(true);
    });

    it('should return false when status is missing', () => {
      const res = {};
      expect(isLikeNextResponse(res)).toBe(false);
    });

    it('should return false when status is neither number nor function', () => {
      const res = {
        status: 'ok',
      };
      expect(isLikeNextResponse(res)).toBe(false);
    });

    it('should return false for null', () => {
      expect(isLikeNextResponse(null)).toBe(false);
    });
  });

  describe('isNextApiResponse', () => {
    it('should return true for valid NextApiResponse-like object', () => {
      const res = {
        status: jest.fn(),
        json: jest.fn(),
        getHeader: jest.fn(),
      };
      expect(isNextApiResponse(res)).toBe(true);
    });

    it('should return false when json is missing', () => {
      const res = {
        status: jest.fn(),
        getHeader: jest.fn(),
      };
      expect(isNextApiResponse(res)).toBe(false);
    });

    it('should return false when getHeader is missing', () => {
      const res = {
        status: jest.fn(),
        json: jest.fn(),
      };
      expect(isNextApiResponse(res)).toBe(false);
    });

    it('should return false for NextResponse-like object (numeric status)', () => {
      const res = {
        status: 200,
        json: jest.fn(),
        getHeader: jest.fn(),
      };
      expect(isNextApiResponse(res)).toBe(false);
    });
  });

  describe('isNextResponse', () => {
    it('should return true for valid NextResponse-like object', () => {
      const res = {
        status: 200,
        headers: new Headers(),
        cookies: {},
      };
      expect(isNextResponse(res)).toBe(true);
    });

    it('should return false when headers is missing', () => {
      const res = {
        status: 200,
        cookies: {},
      };
      expect(isNextResponse(res)).toBe(false);
    });

    it('should return false when cookies is missing', () => {
      const res = {
        status: 200,
        headers: new Headers(),
      };
      expect(isNextResponse(res)).toBe(false);
    });

    it('should return false for NextApiResponse-like object (function status)', () => {
      const res = {
        status: jest.fn(),
        headers: new Headers(),
        cookies: {},
      };
      expect(isNextResponse(res)).toBe(false);
    });

    it('should return false when status is not a number', () => {
      const res = {
        status: 'ok',
        headers: new Headers(),
        cookies: {},
      };
      expect(isNextResponse(res)).toBe(false);
    });
  });
});
