/* eslint-disable @typescript-eslint/no-explicit-any */
jest.mock('./connection', () => jest.fn());
jest.mock('postgres');
import {
  sqlNeonAdapter,
  isSqlNeonAdapter,
  unwrapAdapter,
  query,
  queryExt,
  queryRaw,
  db,
  Resultset,
} from '@/lib/neondb/index-postgres';

/*
const mockSql = jest.fn();
const mockPendingQuery = Promise.resolve({
  columns: [{ name: 'id', number: 0 }],
  command: 'SELECT',
  statement: 'SELECT * FROM test',
  count: 1,
  map: jest.fn(function (this: any) {
    return [this[0]];
  }),
  0: { id: 1 },
  length: 1,
});
*/
describe('sqlNeonAdapter', () => {
  it('should call sql for template queries', () => {
    const sql = jest.fn();
    const adapter = sqlNeonAdapter(sql as any);
    const tpl = [
      'SELECT * FROM test WHERE id = ',
      '',
    ] as unknown as TemplateStringsArray;
    adapter(tpl, 1);
    expect(sql).toHaveBeenCalledWith(tpl, 1);
  });

  it('should attach wrappedAdapter symbol', () => {
    const sql = jest.fn();
    const adapter = sqlNeonAdapter(sql as any);
    const wrapped = (adapter as any)[Object.getOwnPropertySymbols(adapter)[0]];
    expect(wrapped).toBe(sql);
  });
});

describe('isSqlNeonAdapter', () => {
  it('should return true for a valid adapter', () => {
    const sql = jest.fn();
    const adapter = sqlNeonAdapter(sql as any);
    expect(isSqlNeonAdapter(adapter)).toBe(true);
  });

  it('should return false for non-function', () => {
    expect(isSqlNeonAdapter({})).toBe(false);
  });

  it('should return false for function without wrappedAdapter', () => {
    const fn = () => {};
    expect(isSqlNeonAdapter(fn)).toBe(false);
  });
});

describe('unwrapAdapter', () => {
  it('should return the wrapped sql instance', () => {
    const sql = jest.fn();
    const adapter = sqlNeonAdapter(sql as any);
    expect(unwrapAdapter(adapter)).toBe(sql);
  });
});

describe('query', () => {
  it('should resolve with transformed results', async () => {
    const cb = jest.fn().mockResolvedValue([{ id: 1 }, { id: 2 }]);
    const result = await query(cb, {
      transform: (r) => ({ ...r, id: Number(r.id) * 10 }),
    });
    expect(result).toEqual([{ id: 10 }, { id: 20 }]);
    expect(cb).toHaveBeenCalled();
  });

  it('should throw if isDbError returns true', async () => {
    const error = new Error('db error');
    const cb = jest.fn().mockResolvedValue(error);
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    jest.spyOn(require('./_guards'), 'isDbError').mockReturnValue(true);
    await expect(query(cb)).rejects.toBe(error);
  });
});

describe('queryExt', () => {
  it('should resolve with extended results', async () => {
    const cb = jest.fn().mockResolvedValue({
      columns: [{ name: 'id', number: 0 }],
      command: 'SELECT',
      statement: 'SELECT * FROM test',
      count: 1,
      map: jest.fn(() => [{ id: 1 }]),
    });
    const result = await queryExt(cb);
    expect(result).toMatchObject({
      fields: ['id'],
      command: 'SELECT',
      rowCount: 1,
      statement: 'SELECT * FROM test',
      rows: [{ id: 1 }],
    });
  });
});

describe('queryRaw', () => {
  it('should call cb with sql and return its result', () => {
    const cb = jest.fn().mockReturnValue('pending');
    const result = queryRaw(cb);
    expect(cb).toHaveBeenCalled();
    expect(result).toBe('pending');
  });
});

describe('db', () => {
  it('should return a Resultset with transformed records', async () => {
    const cb = jest.fn().mockReturnValue(
      Promise.resolve({
        statement: 'SELECT',
        command: 'SELECT',
        columns: [{ name: 'id', number: 0 }],
        map: function () {
          return [{ id: 1 }];
        },
        [0]: { id: 1 },
        length: 1,
      }),
    );
    const transform = (r: any) =>
      Object.assign([{ id: r.id * 2 }], { id: r.id * 2 }) as any;
    const result = await db(cb, { transform });
    expect(result).toBeInstanceOf(Resultset);
    expect(result[0]).toEqual({ id: 2 });
  });

  it('should return a Resultset with plain records', async () => {
    const cb = jest.fn().mockReturnValue(
      Promise.resolve({
        statement: 'SELECT',
        command: 'SELECT',
        columns: [{ name: 'id', number: 0 }],
        map: function () {
          return [{ id: 1 }];
        },
        [0]: { id: 1 },
        length: 1,
      }),
    );
    const result = await db(cb);
    expect(result).toBeInstanceOf(Resultset);
    expect(result[0]).toEqual({ id: 1 });
  });

  it('should throw if isDbError returns true', async () => {
    const error = new Error('db error');
    const cb = jest.fn().mockReturnValue(Promise.resolve(error));
    jest.spyOn(require('./_guards'), 'isDbError').mockReturnValue(true);
    await expect(db(cb)).rejects.toBe(error);
  });
});

describe('Resultset', () => {
  it('should identify a Resultset instance', () => {
    const rs = new Resultset({
      statement: 's',
      command: 'c',
      fields: [] as any,
      count: 0,
    } as any);
    expect(Resultset.isResultset(rs)).toBe(true);
  });

  it('should identify a RowList', () => {
    const rowList = {
      columns: [],
      command: 'SELECT',
      statement: 'SELECT',
      map: jest.fn(),
      length: 0,
    };
    expect(Resultset.isRowList(rowList)).toBe(true);
  });

  it('should return fields, command, statement, count, rows', () => {
    const rs = new Resultset({
      statement: 's',
      command: 'c',
      fields: [{ name: 'id', number: 0 }],
      records: [{ id: 1 }],
    } as any);
    expect(rs.fields).toEqual([{ name: 'id', number: 0 }]);
    expect(rs.command).toBe('c');
    expect(rs.statement).toBe('s');
    expect(rs.count).toBe(1);
    expect(rs.rows).toEqual([{ id: 1 }]);
  });
});
