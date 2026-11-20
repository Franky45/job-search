/**
 * Core type definitions for Career-Ops v2
 */
export interface Job {
    id?: number;
    canonical_url: string;
    source_url?: string;
    provider: string;
    company: string;
    company_slug?: string;
    title: string;
    location?: string;
    description?: string;
    description_html?: string;
    posted_date?: string;
    discovered_date: string;
    salary_min?: number;
    salary_max?: number;
    salary_currency?: string;
    experience_min?: number;
    experience_max?: number;
    remote_type?: 'remote' | 'hybrid' | 'onsite';
    employment_type?: string;
    tags?: string[];
    status: JobStatus;
    score?: number;
    report_path?: string;
    cv_path?: string;
    notes?: string;
}
export type JobStatus = 'new' | 'evaluated' | 'applied' | 'interview' | 'offer' | 'rejected' | 'discarded';
export interface Company {
    id?: number;
    name: string;
    provider?: string;
    provider_id?: string;
    careers_url?: string;
    enabled: boolean;
    title_filter_positive?: string[];
    title_filter_negative?: string[];
    location_allow?: string[];
    location_block?: string[];
    experience_max_years?: number;
    created_date: string;
    updated_date: string;
}
export interface ScanRun {
    id?: number;
    run_date: string;
    companies_scanned: number;
    jobs_found: number;
    jobs_new: number;
    jobs_filtered: number;
    duration_ms: number;
    errors?: string;
}
export interface UserProfile {
    key: string;
    value: string;
}
export interface ScanConfig {
    concurrency: number;
    max_age_days: number;
    experience_stretch_years: number;
    title_filter: TitleFilter;
    location_filter: LocationFilter;
    experience_max_years: number;
}
export interface TitleFilter {
    positive: string[];
    negative: string[];
}
export interface LocationFilter {
    allow: string[];
    block: string[];
    always_allow?: string[];
    block_hard?: string[];
}
export interface ProviderJob {
    title: string;
    url: string;
    company: string;
    location?: string;
    description?: string;
    description_html?: string;
    posted_date?: string;
    salary_min?: number;
    salary_max?: number;
    salary_currency?: string;
    experience_min?: number;
    experience_max?: number;
    remote_type?: 'remote' | 'hybrid' | 'onsite';
    employment_type?: string;
    tags?: string[];
    metadata?: Record<string, unknown>;
}
export interface ProviderEntry {
    name: string;
    provider: string;
    provider_id?: string;
    careers_url?: string;
    enabled?: boolean;
    title_filter_positive?: string[];
    title_filter_negative?: string[];
    location_allow?: string[];
    location_block?: string[];
    experience_max_years?: number;
}
export interface ProviderConfig {
    id: string;
    name: string;
    detect(entry: ProviderEntry): boolean | Promise<boolean>;
    fetch(entry: ProviderEntry, ctx: FetchContext): Promise<ProviderJob[]>;
}
export interface FetchContext {
    http: ReturnType<typeof import('../providers/http').createHttpClient>;
    cache: ReturnType<typeof import('../providers/http').createCache>;
    signal: AbortSignal;
    concurrency: number;
}
//# sourceMappingURL=models.d.ts.map