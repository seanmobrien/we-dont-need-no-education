/**
 * Formats a duration in milliseconds to a human-readable string.
 * @param ms - Duration in milliseconds
 * @returns Formatted duration string (e.g., "2h 15m", "5m 30s", "45s")
 */
export const formatDuration = (ms: number): string => {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
};

/**
 * Formats a number to a human-readable string with appropriate units.
 * @param num - Number to format
 * @returns Formatted number string (e.g., "1.5M", "2.3K", "150")
 */
export const formatNumber = (num: number): string => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
};

/**
 * Calculates usage percentage with a maximum of 100%.
 * @param used - Used amount
 * @param limit - Maximum limit (null means no limit)
 * @returns Percentage (0-100)
 */
export const getUsagePercentage = (used: number, limit: number | null): number => {
  if (!limit || limit === 0) return 0;
  return Math.min((used / limit) * 100, 100);
};

/**
 * Determines the appropriate color for usage percentage.
 * @param percentage - Usage percentage (0-100)
 * @returns Material-UI color variant
 */
export const getUsageColor = (percentage: number): 'success' | 'warning' | 'error' => {
  if (percentage < 70) return 'success';
  if (percentage < 90) return 'warning';
  return 'error';
};