import {
  formatDuration,
  formatNumber,
  getUsagePercentage,
  getUsageColor,
} from '/lib/site-util/format';

describe('Format utilities', () => {
  describe('formatDuration', () => {
    it('should format seconds correctly', () => {
      expect(formatDuration(5000)).toBe('5s');
      expect(formatDuration(45000)).toBe('45s');
    });

    it('should format minutes correctly', () => {
      expect(formatDuration(60000)).toBe('1m 0s');
      expect(formatDuration(90000)).toBe('1m 30s');
      expect(formatDuration(600000)).toBe('10m 0s');
    });

    it('should format hours correctly', () => {
      expect(formatDuration(3600000)).toBe('1h 0m');
      expect(formatDuration(3660000)).toBe('1h 1m');
      expect(formatDuration(5400000)).toBe('1h 30m');
    });
  });

  describe('formatNumber', () => {
    it('should format small numbers as-is', () => {
      expect(formatNumber(0)).toBe('0');
      expect(formatNumber(42)).toBe('42');
      expect(formatNumber(999)).toBe('999');
    });

    it('should format thousands with K suffix', () => {
      expect(formatNumber(1000)).toBe('1.0K');
      expect(formatNumber(1500)).toBe('1.5K');
      expect(formatNumber(42000)).toBe('42.0K');
    });

    it('should format millions with M suffix', () => {
      expect(formatNumber(1000000)).toBe('1.0M');
      expect(formatNumber(2500000)).toBe('2.5M');
      expect(formatNumber(42000000)).toBe('42.0M');
    });
  });

  describe('getUsagePercentage', () => {
    it('should calculate percentage correctly', () => {
      expect(getUsagePercentage(50, 100)).toBe(50);
      expect(getUsagePercentage(25, 100)).toBe(25);
      expect(getUsagePercentage(75, 100)).toBe(75);
    });

    it('should cap at 100%', () => {
      expect(getUsagePercentage(150, 100)).toBe(100);
      expect(getUsagePercentage(200, 100)).toBe(100);
    });

    it('should return 0 for null or zero limits', () => {
      expect(getUsagePercentage(50, null)).toBe(0);
      expect(getUsagePercentage(50, 0)).toBe(0);
    });
  });

  describe('getUsageColor', () => {
    it('should return success for low usage', () => {
      expect(getUsageColor(0)).toBe('success');
      expect(getUsageColor(50)).toBe('success');
      expect(getUsageColor(69)).toBe('success');
    });

    it('should return warning for medium usage', () => {
      expect(getUsageColor(70)).toBe('warning');
      expect(getUsageColor(80)).toBe('warning');
      expect(getUsageColor(89)).toBe('warning');
    });

    it('should return error for high usage', () => {
      expect(getUsageColor(90)).toBe('error');
      expect(getUsageColor(95)).toBe('error');
      expect(getUsageColor(100)).toBe('error');
    });
  });
});
