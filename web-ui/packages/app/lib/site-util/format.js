export const formatDuration = (ms) => {
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
export const formatElapsed = (fromDate) => {
    if (!fromDate)
        return undefined;
    const start = new Date();
    const end = typeof fromDate === 'string' ? new Date(fromDate) : fromDate;
    const elapsed = end.getTime() - start.getTime();
    return formatDuration(elapsed);
};
export const formatNumber = (num) => {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
};
export const getUsagePercentage = (used, limit) => {
    if (!limit || limit === 0)
        return 0;
    return Math.min((used / limit) * 100, 100);
};
export const getUsageColor = (percentage) => {
    if (percentage < 70)
        return 'success';
    if (percentage < 90)
        return 'warning';
    return 'error';
};
//# sourceMappingURL=format.js.map