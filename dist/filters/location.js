/**
 * Location filter - allow/block/always_allow with word boundary matching
 */
const LOCATION_WORD_CP = /^[\p{L}\p{M}\p{N}]$/u;
const US_COUNTRY_ALWAYS_ALLOW = new Set(['united states', 'usa', 'u.s.', 'u.s.a.']);
const USPS_STATES = [
    ['alabama', 'al'], ['alaska', 'ak'], ['arizona', 'az'], ['arkansas', 'ar'],
    ['california', 'ca'], ['colorado', 'co'], ['connecticut', 'ct'], ['delaware', 'de'],
    ['florida', 'fl'], ['georgia', 'ga'], ['hawaii', 'hi'], ['idaho', 'id'],
    ['illinois', 'il'], ['indiana', 'in'], ['iowa', 'ia'], ['kansas', 'ks'],
    ['kentucky', 'ky'], ['louisiana', 'la'], ['maine', 'me'], ['maryland', 'md'],
    ['massachusetts', 'ma'], ['michigan', 'mi'], ['minnesota', 'mn'], ['mississippi', 'ms'],
    ['missouri', 'mo'], ['montana', 'mt'], ['nebraska', 'ne'], ['nevada', 'nv'],
    ['new hampshire', 'nh'], ['new jersey', 'nj'], ['new mexico', 'nm'], ['new york', 'ny'],
    ['north carolina', 'nc'], ['north dakota', 'nd'], ['ohio', 'oh'], ['oklahoma', 'ok'],
    ['oregon', 'or'], ['pennsylvania', 'pa'], ['rhode island', 'ri'], ['south carolina', 'sc'],
    ['south dakota', 'sd'], ['tennessee', 'tn'], ['texas', 'tx'], ['utah', 'ut'],
    ['vermont', 'vt'], ['virginia', 'va'], ['washington', 'wa'], ['west virginia', 'wv'],
    ['wisconsin', 'wi'], ['wyoming', 'wy']
];
function compileLocationKeyword(keyword) {
    const trimmed = keyword.trim();
    if (!trimmed)
        return () => false;
    // Two-letter uppercase = ISO country code (case sensitive)
    if (/^[A-Z]{2}$/.test(trimmed)) {
        const re = new RegExp(`(?<![\\p{L}\\p{M}\\p{N}])${trimmed}(?![\\p{L}\\p{M}\\p{N}])`, 'u');
        return (_lower, original) => typeof original === 'string' && re.test(original);
    }
    // Normal case-insensitive with word boundaries
    const lower = trimmed.toLowerCase();
    const codePoints = [...lower];
    const startsWord = LOCATION_WORD_CP.test(codePoints[0] ?? '');
    const endsWord = LOCATION_WORD_CP.test(codePoints.at(-1) ?? '');
    const prefix = startsWord ? '(?<![\\p{L}\\p{M}\\p{N}])' : '';
    const suffix = endsWord ? '(?![\\p{L}\\p{M}\\p{N}])' : '';
    const escaped = lower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`${prefix}${escaped}${suffix}`, 'u');
    return (lowerText) => re.test(lowerText);
}
function compileLocationKeywordList(keywords) {
    return keywords
        .filter(k => typeof k === 'string' && k.trim())
        .map(compileLocationKeyword);
}
function normalizeLocationText(location) {
    const original = location || '';
    const lower = original.toLowerCase();
    // Split by common separators
    const parts = original.split(/[,;|]/).map(p => p.trim()).filter(Boolean);
    const placesWithoutCountry = parts.map(place => {
        const segments = place.split(',').map(s => s.trim()).filter(Boolean);
        // Remove country code if present (last segment is 2-letter uppercase)
        if (segments.length >= 2 && /^[A-Z]{2}$/.test(segments[segments.length - 1])) {
            return segments.slice(0, -1).join(', ');
        }
        return place;
    });
    return { lower, original, placesWithoutCountry };
}
function compileUsStateAbbrev(abbr) {
    const escaped = abbr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`(?:,\\s*${escaped}(?![\\p{L}\\p{M}\\p{N}])|(?:^|[^\\p{L}\\p{M}\\p{N}])${escaped}[^\\p{L}\\p{M}\\p{N}]*$)`, 'u');
    return (lower) => {
        const { placesWithoutCountry } = normalizeLocationText(lower);
        return placesWithoutCountry.some(place => re.test(place.toLowerCase()));
    };
}
export function buildLocationFilter(locationFilter) {
    const blockHard = compileLocationKeywordList(locationFilter.block_hard || []);
    const alwaysAllow = compileLocationKeywordList(locationFilter.always_allow || []);
    const block = compileLocationKeywordList(locationFilter.block || []);
    const allow = compileLocationKeywordList(locationFilter.allow || []);
    // US state abbreviations from always_allow if it contains US
    const alwaysAllowHasUS = (locationFilter.always_allow || []).some(k => US_COUNTRY_ALWAYS_ALLOW.has(k.toLowerCase()));
    const usStateMatchers = alwaysAllowHasUS
        ? USPS_STATES.flatMap(([name, abbr]) => [
            compileLocationKeyword(name),
            compileUsStateAbbrev(abbr)
        ])
        : [];
    return (location, urlHint) => {
        const locText = location || '';
        const hint = urlHint || '';
        const { lower, original, placesWithoutCountry } = normalizeLocationText(locText + ' ' + hint);
        // Empty location with no URL hint - pass unless strict mode with restrictions
        if (!locText.trim() && !hint.trim()) {
            const hasRestrictions = (locationFilter.allow?.length ?? 0) > 0 ||
                (locationFilter.block?.length ?? 0) > 0 ||
                (locationFilter.block_hard?.length ?? 0) > 0;
            return !hasRestrictions;
        }
        // 1. block_hard always rejects (highest priority)
        for (const matcher of blockHard) {
            if (matcher(lower, original))
                return false;
        }
        // 2. always_allow passes (overrides block)
        for (const matcher of alwaysAllow) {
            if (matcher(lower, original))
                return true;
        }
        // US states also count as always_allow when US is in always_allow
        for (const matcher of usStateMatchers) {
            if (matcher(lower))
                return true;
        }
        // 3. block rejects
        for (const matcher of block) {
            if (matcher(lower, original))
                return false;
        }
        // 4. allow empty = pass (already cleared block_hard and block)
        if (allow.length === 0)
            return true;
        // 5. allow non-empty = must match at least one
        for (const matcher of allow) {
            if (matcher(lower, original))
                return true;
        }
        for (const matcher of usStateMatchers) {
            if (matcher(lower))
                return true;
        }
        return false;
    };
}
//# sourceMappingURL=location.js.map