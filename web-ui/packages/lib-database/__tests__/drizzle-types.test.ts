import {
  errorFromCode,
  PG_ERROR_CODE_DESCRIPTIONS,
} from '@compliance-theater/database';

describe('Postgres error code helpers', () => {
  test('returns canonical description for known code', () => {
    expect(errorFromCode('23505')).toBe('unique_violation');
  });

  test('is case-insensitive and trims input', () => {
    expect(errorFromCode(' 22p02 ')).toBe('invalid_text_representation');
  });

  test('unknown code returns undefined', () => {
    expect(errorFromCode('ZZ999')).toBeUndefined();
  });

  test('PG_ERROR_CODE_DESCRIPTIONS contains expected entries', () => {
    expect(PG_ERROR_CODE_DESCRIPTIONS['23505']).toBe('unique_violation');
    expect(PG_ERROR_CODE_DESCRIPTIONS['22P02']).toBe(
      'invalid_text_representation',
    );
  });

  test('errorFromCode gracefully handles undefined/null', () => {
    expect(errorFromCode(undefined)).toBeUndefined();
    expect(errorFromCode(null)).toBeUndefined();
  });
});
