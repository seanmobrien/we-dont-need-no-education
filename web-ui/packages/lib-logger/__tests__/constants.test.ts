import { asKnownSeverityLevel, KnownSeverityLevel } from '../src/constants';

describe('constants/asKnownSeverityLevel', () => {
  it('maps numeric values to known severities', () => {
    expect(asKnownSeverityLevel(0)).toBe(KnownSeverityLevel.Verbose);
    expect(asKnownSeverityLevel(1)).toBe(KnownSeverityLevel.Information);
    expect(asKnownSeverityLevel(2)).toBe(KnownSeverityLevel.Warning);
    expect(asKnownSeverityLevel(3)).toBe(KnownSeverityLevel.Error);
    expect(asKnownSeverityLevel(4)).toBe(KnownSeverityLevel.Critical);
    expect(asKnownSeverityLevel(9)).toBe(KnownSeverityLevel.Information);
    expect(asKnownSeverityLevel(19)).toBe(KnownSeverityLevel.Warning);
    expect(asKnownSeverityLevel(29)).toBe(KnownSeverityLevel.Error);
    expect(asKnownSeverityLevel(39)).toBe(KnownSeverityLevel.Critical);
    expect(asKnownSeverityLevel(100)).toBe(KnownSeverityLevel.Error);
  });

  it('maps string-like values case-insensitively and defaults to Error', () => {
    expect(asKnownSeverityLevel('VERBOSE')).toBe(KnownSeverityLevel.Verbose);
    expect(asKnownSeverityLevel('Information')).toBe(KnownSeverityLevel.Information);
    expect(asKnownSeverityLevel('warning')).toBe(KnownSeverityLevel.Warning);
    expect(asKnownSeverityLevel('error')).toBe(KnownSeverityLevel.Error);
    expect(asKnownSeverityLevel('critical')).toBe(KnownSeverityLevel.Critical);
    expect(asKnownSeverityLevel('unknown')).toBe(KnownSeverityLevel.Error);
    expect(asKnownSeverityLevel(null)).toBe(KnownSeverityLevel.Error);
  });
});
