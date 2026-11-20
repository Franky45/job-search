/**
 * Experience filter - parses years requirements from job descriptions
 */
const EXPERIENCE_PATTERNS = [
    // "X-Y years" or "X–Y years"
    /(\d+)\s*[\-–]\s*(\d+)\s*(?:years?|yrs?)/gi,
    // "X+ years"
    /(\d+)\s*\+\s*(?:years?|yrs?)/gi,
    // "minimum X years" / "at least X years"
    /(?:minimum|at least)\s+(\d+)\s*(?:years?|yrs?)/gi,
    // "X years of experience" / "X years experience"
    /(\d+)\s*(?:years?|yrs?)\s*(?:of\s+)?experience/gi,
    // "experience: X years"
    /experience\s*[:\-]\s*(\d+)\s*(?:years?|yrs?)/gi,
    // "X years" (simple, but less specific)
    /(\d+)\s*(?:years?|yrs?)\b/gi
];
export function extractExperience(text) {
    if (!text)
        return null;
    const matches = [];
    for (const pattern of EXPERIENCE_PATTERNS) {
        let match;
        while ((match = pattern.exec(text)) !== null) {
            if (match[2]) {
                // Range pattern (X-Y)
                matches.push({
                    min: parseInt(match[1], 10),
                    max: parseInt(match[2], 10),
                    raw: match[0]
                });
            }
            else if (match[0].includes('+') || /minimum|at least/i.test(match[0])) {
                // Minimum only (X+)
                matches.push({
                    min: parseInt(match[1], 10),
                    raw: match[0]
                });
            }
            else {
                // Simple "X years" - could be min or exact
                matches.push({
                    min: parseInt(match[1], 10),
                    max: parseInt(match[1], 10),
                    raw: match[0]
                });
            }
        }
    }
    if (matches.length === 0)
        return null;
    // Return the most specific match (prefer ranges, then minimums)
    matches.sort((a, b) => {
        // Prefer ranges over single values
        const aHasRange = a.max !== undefined && a.min !== a.max;
        const bHasRange = b.max !== undefined && b.min !== b.max;
        if (aHasRange && !bHasRange)
            return -1;
        if (!aHasRange && bHasRange)
            return 1;
        // Prefer higher minimum (more specific)
        return (b.min || 0) - (a.min || 0);
    });
    return matches[0];
}
export function buildExperienceFilter(config) {
    const maxYears = config.maxYears ?? 15;
    const stretchYears = config.stretchYears ?? 2;
    const effectiveMax = maxYears + stretchYears;
    return (jobExp) => {
        if (!jobExp)
            return true; // No experience requirement stated - allow
        // If job requires minimum experience higher than our stretch max, reject
        if (jobExp.min !== undefined && jobExp.min > effectiveMax) {
            return false;
        }
        return true;
    };
}
export function getExperienceLabel(jobExp) {
    if (!jobExp)
        return '—';
    if (jobExp.min !== undefined && jobExp.max !== undefined && jobExp.min !== jobExp.max) {
        return `${jobExp.min}-${jobExp.max} yrs`;
    }
    if (jobExp.min !== undefined) {
        return `${jobExp.min}+ yrs`;
    }
    return '—';
}
//# sourceMappingURL=experience.js.map