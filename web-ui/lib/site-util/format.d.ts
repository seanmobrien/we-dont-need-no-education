declare module '@/lib/site-util/format' {
  /**
   * Formats a duration in milliseconds to a human-readable string.
   * @param ms - Duration in milliseconds
   * @returns Formatted duration string (e.g., "2h 15m", "5m 30s", "45s")
   */
  export const formatDuration: (ms: number) => string;

  /**
   * Calculates elapsed time from a given date to now and formats it as a human-readable string.
   *
   * @param fromDate - The date used to compute elapsed time.
   * @returns A formatted string describing the duration between now and the provided value.
   *
   * @example
   * ```typescript
   * const elapsed = formatElapsed(new Date('2024-01-01'));
   * console.log(elapsed); // "5h 30m" (if current time is 5.5 hours after the date)
   * ```
   */
  export const formatElapsed: (fromDate: Date | string) => string;

  /**
   * Formats a number to a human-readable string with appropriate units.
   * @param num - Number to format
   * @returns Formatted number string (e.g., "1.5M", "2.3K", "150")
   */
  export const formatNumber: (num: number) => string;

  /**
   * Calculates usage percentage with a maximum of 100%.
   * @param used - Used amount
   * @param limit - Maximum limit (null means no limit)
   * @returns Percentage (0-100)
   */
  export const getUsagePercentage: (
    used: number,
    limit: number | null,
  ) => number;

  /**
   * Determines the appropriate color for usage percentage.
   * @param percentage - Usage percentage (0-100)
   * @returns Material-UI color variant
   */
  export const getUsageColor: (
    percentage: number,
  ) => 'success' | 'warning' | 'error';
}
