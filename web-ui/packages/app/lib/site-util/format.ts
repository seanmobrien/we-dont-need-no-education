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

export const formatElapsed = (fromDate: Date | string): string => {
  if (!fromDate) return undefined as unknown as string;
  const start = new Date();
  const end = typeof fromDate === 'string' ? new Date(fromDate) : fromDate;
  const elapsed = end.getTime() - start.getTime();
  return formatDuration(elapsed);
};

export const formatNumber = (num: number): string => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
};

export const getUsagePercentage = (used: number, limit: number | null): number => {
  if (!limit || limit === 0) return 0;
  return Math.min((used / limit) * 100, 100);
};

export const getUsageColor = (percentage: number): 'success' | 'warning' | 'error' => {
  if (percentage < 70) return 'success';
  if (percentage < 90) return 'warning';
  return 'error';
};