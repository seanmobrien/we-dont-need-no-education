import type { Adapter, JWT, Session, User } from './contracts';

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

export const isSession = (value: unknown): value is Session => {
  return isObject(value) && typeof value['expires'] === 'string';
};

export const isUser = (value: unknown): value is User => {
  return (
    isObject(value) &&
    (typeof value['email'] === 'string' ||
      typeof value['name'] === 'string' ||
      typeof value['id'] === 'string')
  );
};

export const isJWT = (value: unknown): value is JWT => {
  return isObject(value) && (typeof value['sub'] === 'string' || typeof value['iat'] === 'number');
};

export const isAdapter = (value: unknown): value is Adapter => {
  return (
    isObject(value) &&
    (typeof value['getUser'] === 'function' ||
      typeof value['getUserByEmail'] === 'function' ||
      typeof value['createUser'] === 'function')
  );
};
