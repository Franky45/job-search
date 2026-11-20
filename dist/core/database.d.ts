/**
 * SQLite database layer for Career-Ops v2
 * Uses sql.js (WASM) for cross-platform compatibility
 */
import { Job, Company, ScanRun, UserProfile, JobStatus } from './models.js';
export declare class JobDatabase {
    private db;
    private dbPath;
    private static instance;
    private sqlJs;
    private constructor();
    static getInstance(dbPath?: string): Promise<JobDatabase>;
    static resetInstance(): void;
    private init;
    private initializeSchema;
    private save;
    insertJob(job: Omit<Job, 'id'>): number;
    upsertJob(job: Omit<Job, 'id'>): {
        id: number;
        isNew: boolean;
    };
    getJobByCanonicalUrl(canonicalUrl: string): Job | null;
    getJobById(id: number): Job | null;
    updateJob(id: number, job: Partial<Omit<Job, 'id'>>): void;
    getJobs(filters?: {
        status?: JobStatus;
        company?: string;
        provider?: string;
        limit?: number;
        offset?: number;
        orderBy?: string;
        orderDir?: 'ASC' | 'DESC';
    }): Job[];
    getJobCount(filters?: {
        status?: JobStatus;
        company?: string;
    }): number;
    insertCompany(company: Omit<Company, 'id'>): number;
    upsertCompany(company: Omit<Company, 'id'>): number;
    getCompanyByName(name: string): Company | null;
    getCompanyById(id: number): Company | null;
    updateCompany(id: number, company: Partial<Omit<Company, 'id'>>): void;
    getCompanies(enabledOnly?: boolean): Company[];
    deleteCompany(id: number): void;
    insertScanRun(run: Omit<ScanRun, 'id'>): number;
    getScanRuns(limit?: number): ScanRun[];
    setProfile(key: string, value: string): void;
    getProfile(key: string): string | null;
    getAllProfile(): UserProfile[];
    addPipelineEntry(entry: {
        url: string;
        company?: string;
        title?: string;
        location?: string;
        notes?: string;
    }): number;
    getPipelineEntries(): any[];
    removePipelineEntry(id: number): void;
    updatePipelineEntryChecked(id: number, checked: boolean): void;
    close(): void;
    private mapRowToJob;
    private mapRowToCompany;
}
export declare function getDatabase(dbPath?: string): Promise<JobDatabase>;
//# sourceMappingURL=database.d.ts.map