 
import {
  buildAttachmentOrEmailFilter,
  buildQueryFilter,
} from '@/lib/components/mui/data-grid/queryHelpers/postgres';
import { GridFilterModel } from '@mui/x-data-grid-pro';
import { sqlNeonAdapter } from '@/lib/neondb/index-postgres';

// Minimal mock for Sql<any> to satisfy sqlNeonAdapter
function sqlMock(...args: unknown[]) {
  if (
    Array.isArray(args[0]) &&
    Object.prototype.hasOwnProperty.call(args[0], 'raw')
  ) {
    const [strings, ...values] = args as [TemplateStringsArray, ...unknown[]];
    return Array.from(strings as unknown as string[]).reduce(
      (acc, str, i) => acc + str + (values[i] !== undefined ? values[i] : ''),
      '',
    );
  }
  if (typeof args[0] === 'string') return args[0];
  return '';
}
sqlMock.unsafe = sqlMock;
sqlMock.options = {};

describe('buildAttachmentOrEmailFilter', () => {
  const sql = sqlNeonAdapter(sqlMock as any);

  it('returns WHERE with email_id when attachments is true', () => {
    const result = buildAttachmentOrEmailFilter({
      attachments: true,
      email_id: 'abc',
      sql,
    });
    expect(result).toContain('WHERE email_id = abc');
  });

  it('returns WHERE with email_to_document_id when attachments is false', () => {
    const result = buildAttachmentOrEmailFilter({
      attachments: false,
      email_id: 'abc',
      sql,
    });
    expect(result).toContain('WHERE email_to_document_id(abc) = unit_id');
  });

  it('handles URLSearchParams attachments=true', () => {
    const params = new URLSearchParams({ attachments: 'true' });
    const result = buildAttachmentOrEmailFilter({
      attachments: params,
      email_id: 'abc',
      sql,
    });
    expect(result).toContain('WHERE email_id = abc');
  });

  it('handles URLSearchParams attachments=false', () => {
    const params = new URLSearchParams({ attachments: 'false' });
    const result = buildAttachmentOrEmailFilter({
      attachments: params,
      email_id: 'abc',
      sql,
    });
    expect(result).toContain('WHERE email_to_document_id(abc) = unit_id');
  });

  it('throws on invalid attachments object', () => {
    expect(() =>
      buildAttachmentOrEmailFilter({
        attachments: { foo: 'bar' } as any,
        email_id: 'abc',
        sql,
      }),
    ).toThrow();
  });
});

describe('buildQueryFilter', () => {
  const sql = sqlNeonAdapter(sqlMock as any);

  it('returns empty string for undefined source and defaultFilter', () => {
    expect(buildQueryFilter({ sql, source: undefined })).toBe('');
  });

  it('returns WHERE with filter items', () => {
    const filter: GridFilterModel = {
      items: [{ field: 'foo', operator: 'equals', value: 'bar' }],
    };
    const result = buildQueryFilter({ sql, source: filter });
    expect(result).toContain(`WHERE  (foo = 'bar')`);
  });

  it('returns AND with append true', () => {
    const filter: GridFilterModel = {
      items: [{ field: 'foo', operator: 'equals', value: 'bar' }],
    };
    const result = buildQueryFilter({ sql, source: filter, append: true });
    expect(result).toContain(`AND  (foo = 'bar')`);
  });

  it('returns empty string for filter with empty items', () => {
    const filter: GridFilterModel = { items: [] };
    expect(buildQueryFilter({ sql, source: filter })).toBe('');
  });

  it('uses defaultFilter if source is undefined', () => {
    const filter: GridFilterModel = {
      items: [{ field: 'foo', operator: 'equals', value: 'bar' }],
    };
    const result = buildQueryFilter({
      sql,
      source: undefined,
      defaultFilter: filter,
    });
    expect(result).toContain(`WHERE  (foo = 'bar')`);
  });
});
