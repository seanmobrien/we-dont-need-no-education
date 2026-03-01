import {
  DataIntegrityError,
  type DataIntegrityErrorOptions,
} from '../../src/errors/data-integrity-error';

describe('DataIntegrityError', () => {
  it('buildMessage includes table/source when present', () => {
    const options: DataIntegrityErrorOptions = {
      table: 'users',
      source: 'repo.findOne',
    };
    expect(DataIntegrityError.buildMessage(options)).toContain("Table 'users'");
    expect(DataIntegrityError.buildMessage(options)).toContain(
      'Source: repo.findOne',
    );
  });

  it('buildMessage falls back when table/source absent', () => {
    expect(DataIntegrityError.buildMessage({})).toBe('DataIntegrity error');
  });

  it('constructs from options and exposes getters', () => {
    const error = new DataIntegrityError({ table: 'emails', source: 'service' }, {
      table: 'emails',
      source: 'service',
    });
    expect(error.name).toBe('DataIntegrityError');
    expect(error.table).toBe('emails');
    expect(error.source).toBe('service');
    expect(error.message).toContain("Table 'emails'");
  });

  it('constructs from explicit message', () => {
    const error = new DataIntegrityError('manual message');
    expect(error.message).toBe('manual message');
    expect(error.table).toBe('');
    expect(error.source).toBe('');
  });

  it('type guard uses brand via cause', () => {
    const error = new DataIntegrityError('x');
    expect(DataIntegrityError.isDataIntegrityError(error)).toBe(true);
    expect(DataIntegrityError.isDataIntegrityError(new Error('x'))).toBe(false);
    expect(DataIntegrityError.isDataIntegrityError(null)).toBe(false);
  });

  it('falls back to default message text when Error.prototype.message is undefined', () => {
    const originalDescriptor = Object.getOwnPropertyDescriptor(
      Error.prototype,
      'message',
    );

    Object.defineProperty(Error.prototype, 'message', {
      configurable: true,
      value: undefined,
      writable: true,
    });

    try {
      const error = new DataIntegrityError('manual', { table: 'audit' });
      delete (error as { message?: string }).message;
      expect(error.message).toBe('Data Integrity issue detected on table audit');
    } finally {
      if (originalDescriptor) {
        Object.defineProperty(Error.prototype, 'message', originalDescriptor);
      }
    }
  });
});
