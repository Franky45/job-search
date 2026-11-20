/**
 * Base provider class and interfaces
 */
import { ProviderEntry, ProviderJob, FetchContext } from '../core/models.js';
export declare abstract class BaseProvider {
    abstract readonly id: string;
    abstract readonly name: string;
    /**
     * Detect if this provider can handle the given entry
     * Return true if this provider should be used
     */
    abstract detect(entry: ProviderEntry): boolean | Promise<boolean>;
    /**
     * Fetch jobs from the provider
     */
    abstract fetch(entry: ProviderEntry, ctx: FetchContext): Promise<ProviderJob[]>;
    /**
     * Normalize a job URL to canonical form for deduplication
     */
    normalizeUrl(url: string): string;
    /**
     * Check if fragment contains a job ID (e.g., #job-123, #/job/123)
     */
    protected isJobIdFragment(hash: string): boolean;
    /**
     * Extract company slug from URL or entry
     */
    extractCompanySlug(entry: ProviderEntry): string;
    /**
     * Parse posted date from various formats
     */
    parsePostedDate(dateStr: string | undefined): string | undefined;
    /**
     * Extract experience requirements from text
     */
    extractExperience(text: string): {
        min?: number;
        max?: number;
    } | null;
    /**
     * Extract skills/keywords from job description
     */
    extractSkills(text: string, skillKeywords: string[]): string[];
    /**
     * Determine remote type from location text
     */
    determineRemoteType(location: string): 'remote' | 'hybrid' | 'onsite' | undefined;
}
export interface ProviderModule {
    default: BaseProvider;
}
//# sourceMappingURL=base.d.ts.map