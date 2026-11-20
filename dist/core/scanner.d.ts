/**
 * Scanner orchestration - coordinates providers, filters, and database
 */
export { getDatabase } from './database.js';
export interface ScanOptions {
    dryRun?: boolean;
    singleCompany?: string;
    limit?: number;
}
export interface ScanResult {
    companiesScanned: number;
    jobsFound: number;
    jobsNew: number;
    jobsFiltered: number;
    jobsDuplicate: number;
    durationMs: number;
    errors: string[];
}
export declare function runScan(options?: ScanOptions): Promise<ScanResult>;
//# sourceMappingURL=scanner.d.ts.map