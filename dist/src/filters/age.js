/**
 * Age filter - filters jobs by posting date
 */
export function buildAgeFilter(maxAgeDays) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - maxAgeDays);
    return (postedDate) => {
        if (!postedDate)
            return true; // Unknown date - allow
        try {
            const posted = new Date(postedDate);
            if (isNaN(posted.getTime()))
                return true; // Invalid date - allow
            return posted >= cutoffDate;
        }
        catch {
            return true; // Parse error - allow
        }
    };
}
export function getAgeLabel(postedDate) {
    if (!postedDate)
        return '—';
    try {
        const posted = new Date(postedDate);
        if (isNaN(posted.getTime()))
            return '—';
        const now = new Date();
        const diffMs = now.getTime() - posted.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        if (diffDays < 0)
            return 'Future';
        if (diffDays === 0)
            return 'Today';
        if (diffDays === 1)
            return '1 day ago';
        if (diffDays < 7)
            return `${diffDays} days ago`;
        if (diffDays < 30)
            return `${Math.floor(diffDays / 7)} weeks ago`;
        if (diffDays < 365)
            return `${Math.floor(diffDays / 30)} months ago`;
        return `${Math.floor(diffDays / 365)} years ago`;
    }
    catch {
        return '—';
    }
}
//# sourceMappingURL=age.js.map