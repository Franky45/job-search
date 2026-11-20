/**
 * Configuration loader with Zod validation
 * Supports YAML config file + environment variable overrides
 */
import { z } from 'zod';
import { ProviderEntry } from './models.js';
declare const ScanConfigSchema: z.ZodObject<{
    concurrency: z.ZodDefault<z.ZodNumber>;
    max_age_days: z.ZodDefault<z.ZodNumber>;
    experience_stretch_years: z.ZodDefault<z.ZodNumber>;
    title_filter: z.ZodDefault<z.ZodObject<{
        positive: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        negative: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        positive: string[];
        negative: string[];
    }, {
        positive?: string[] | undefined;
        negative?: string[] | undefined;
    }>>;
    location_filter: z.ZodDefault<z.ZodObject<{
        allow: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        block: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        always_allow: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        block_hard: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        allow: string[];
        block: string[];
        always_allow?: string[] | undefined;
        block_hard?: string[] | undefined;
    }, {
        allow?: string[] | undefined;
        block?: string[] | undefined;
        always_allow?: string[] | undefined;
        block_hard?: string[] | undefined;
    }>>;
    experience_max_years: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    experience_max_years: number;
    concurrency: number;
    max_age_days: number;
    experience_stretch_years: number;
    title_filter: {
        positive: string[];
        negative: string[];
    };
    location_filter: {
        allow: string[];
        block: string[];
        always_allow?: string[] | undefined;
        block_hard?: string[] | undefined;
    };
}, {
    experience_max_years?: number | undefined;
    concurrency?: number | undefined;
    max_age_days?: number | undefined;
    experience_stretch_years?: number | undefined;
    title_filter?: {
        positive?: string[] | undefined;
        negative?: string[] | undefined;
    } | undefined;
    location_filter?: {
        allow?: string[] | undefined;
        block?: string[] | undefined;
        always_allow?: string[] | undefined;
        block_hard?: string[] | undefined;
    } | undefined;
}>;
declare const CompanySchema: z.ZodObject<{
    name: z.ZodString;
    provider: z.ZodOptional<z.ZodString>;
    provider_id: z.ZodOptional<z.ZodString>;
    careers_url: z.ZodOptional<z.ZodString>;
    enabled: z.ZodDefault<z.ZodBoolean>;
    title_filter_positive: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    title_filter_negative: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    location_allow: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    location_block: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    experience_max_years: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    name: string;
    enabled: boolean;
    provider?: string | undefined;
    provider_id?: string | undefined;
    careers_url?: string | undefined;
    title_filter_positive?: string[] | undefined;
    title_filter_negative?: string[] | undefined;
    location_allow?: string[] | undefined;
    location_block?: string[] | undefined;
    experience_max_years?: number | undefined;
}, {
    name: string;
    provider?: string | undefined;
    provider_id?: string | undefined;
    careers_url?: string | undefined;
    enabled?: boolean | undefined;
    title_filter_positive?: string[] | undefined;
    title_filter_negative?: string[] | undefined;
    location_allow?: string[] | undefined;
    location_block?: string[] | undefined;
    experience_max_years?: number | undefined;
}>;
declare const UserConfigSchema: z.ZodObject<{
    data_dir: z.ZodDefault<z.ZodString>;
    output_dir: z.ZodDefault<z.ZodString>;
    scan: z.ZodDefault<z.ZodObject<{
        concurrency: z.ZodDefault<z.ZodNumber>;
        max_age_days: z.ZodDefault<z.ZodNumber>;
        experience_stretch_years: z.ZodDefault<z.ZodNumber>;
        title_filter: z.ZodDefault<z.ZodObject<{
            positive: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            negative: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        }, "strip", z.ZodTypeAny, {
            positive: string[];
            negative: string[];
        }, {
            positive?: string[] | undefined;
            negative?: string[] | undefined;
        }>>;
        location_filter: z.ZodDefault<z.ZodObject<{
            allow: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            block: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            always_allow: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            block_hard: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        }, "strip", z.ZodTypeAny, {
            allow: string[];
            block: string[];
            always_allow?: string[] | undefined;
            block_hard?: string[] | undefined;
        }, {
            allow?: string[] | undefined;
            block?: string[] | undefined;
            always_allow?: string[] | undefined;
            block_hard?: string[] | undefined;
        }>>;
        experience_max_years: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        experience_max_years: number;
        concurrency: number;
        max_age_days: number;
        experience_stretch_years: number;
        title_filter: {
            positive: string[];
            negative: string[];
        };
        location_filter: {
            allow: string[];
            block: string[];
            always_allow?: string[] | undefined;
            block_hard?: string[] | undefined;
        };
    }, {
        experience_max_years?: number | undefined;
        concurrency?: number | undefined;
        max_age_days?: number | undefined;
        experience_stretch_years?: number | undefined;
        title_filter?: {
            positive?: string[] | undefined;
            negative?: string[] | undefined;
        } | undefined;
        location_filter?: {
            allow?: string[] | undefined;
            block?: string[] | undefined;
            always_allow?: string[] | undefined;
            block_hard?: string[] | undefined;
        } | undefined;
    }>>;
    companies: z.ZodDefault<z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        provider: z.ZodOptional<z.ZodString>;
        provider_id: z.ZodOptional<z.ZodString>;
        careers_url: z.ZodOptional<z.ZodString>;
        enabled: z.ZodDefault<z.ZodBoolean>;
        title_filter_positive: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        title_filter_negative: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        location_allow: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        location_block: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        experience_max_years: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        enabled: boolean;
        provider?: string | undefined;
        provider_id?: string | undefined;
        careers_url?: string | undefined;
        title_filter_positive?: string[] | undefined;
        title_filter_negative?: string[] | undefined;
        location_allow?: string[] | undefined;
        location_block?: string[] | undefined;
        experience_max_years?: number | undefined;
    }, {
        name: string;
        provider?: string | undefined;
        provider_id?: string | undefined;
        careers_url?: string | undefined;
        enabled?: boolean | undefined;
        title_filter_positive?: string[] | undefined;
        title_filter_negative?: string[] | undefined;
        location_allow?: string[] | undefined;
        location_block?: string[] | undefined;
        experience_max_years?: number | undefined;
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    data_dir: string;
    output_dir: string;
    scan: {
        experience_max_years: number;
        concurrency: number;
        max_age_days: number;
        experience_stretch_years: number;
        title_filter: {
            positive: string[];
            negative: string[];
        };
        location_filter: {
            allow: string[];
            block: string[];
            always_allow?: string[] | undefined;
            block_hard?: string[] | undefined;
        };
    };
    companies: {
        name: string;
        enabled: boolean;
        provider?: string | undefined;
        provider_id?: string | undefined;
        careers_url?: string | undefined;
        title_filter_positive?: string[] | undefined;
        title_filter_negative?: string[] | undefined;
        location_allow?: string[] | undefined;
        location_block?: string[] | undefined;
        experience_max_years?: number | undefined;
    }[];
}, {
    data_dir?: string | undefined;
    output_dir?: string | undefined;
    scan?: {
        experience_max_years?: number | undefined;
        concurrency?: number | undefined;
        max_age_days?: number | undefined;
        experience_stretch_years?: number | undefined;
        title_filter?: {
            positive?: string[] | undefined;
            negative?: string[] | undefined;
        } | undefined;
        location_filter?: {
            allow?: string[] | undefined;
            block?: string[] | undefined;
            always_allow?: string[] | undefined;
            block_hard?: string[] | undefined;
        } | undefined;
    } | undefined;
    companies?: {
        name: string;
        provider?: string | undefined;
        provider_id?: string | undefined;
        careers_url?: string | undefined;
        enabled?: boolean | undefined;
        title_filter_positive?: string[] | undefined;
        title_filter_negative?: string[] | undefined;
        location_allow?: string[] | undefined;
        location_block?: string[] | undefined;
        experience_max_years?: number | undefined;
    }[] | undefined;
}>;
export type UserConfig = z.infer<typeof UserConfigSchema>;
export type ValidatedScanConfig = z.infer<typeof ScanConfigSchema>;
export type ValidatedCompany = z.infer<typeof CompanySchema>;
export declare class ConfigLoader {
    private config;
    private configPath;
    constructor(configPath?: string);
    load(): UserConfig;
    getConfig(): UserConfig;
    getScanConfig(): ValidatedScanConfig;
    getCompanies(): ValidatedCompany[];
    getDataDir(): string;
    getOutputDir(): string;
    private deepMerge;
    private applyEnvOverrides;
    getProviderEntries(): ProviderEntry[];
}
export declare function getConfig(configPath?: string): ConfigLoader;
export declare function resetConfig(): void;
export {};
//# sourceMappingURL=config.d.ts.map