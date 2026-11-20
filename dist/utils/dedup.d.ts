/**
 * Deduplication utilities - canonical URL and job fingerprinting
 */
/**
 * Generate canonical URL for deduplication
 * Normalizes URL by removing tracking params, standardizing host, etc.
 */
export declare function generateCanonicalUrl(url: string | undefined, title: string, company: string): string;
/**
 * Generate content fingerprint for cross-listing detection
 * Uses title + company + location + first 500 chars of description
 */
export declare function generateFingerprint(title: string, company: string, location: string, description: string): string;
/**
 * Check if two jobs are likely the same position
 * Uses canonical URL first, then fingerprint
 */
export declare function areJobsSame(url1: string, title1: string, company1: string, location1: string, desc1: string, url2: string, title2: string, company2: string, location2: string, desc2: string): boolean;
/**
 * Normalize company name for comparison
 */
export declare function normalizeCompanyName(name: string): string;
/**
 * Check if two company names refer to the same entity
 */
export declare function companiesMatch(name1: string, name2: string): boolean;
//# sourceMappingURL=dedup.d.ts.map