/**
 * Configuration loader with Zod validation
 * Supports YAML config file + environment variable overrides
 */
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { homedir } from 'os';
import * as yaml from 'js-yaml';
import { z } from 'zod';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// Zod schemas for validation
const TitleFilterSchema = z.object({
    positive: z.array(z.string()).default([]),
    negative: z.array(z.string()).default([])
});
const LocationFilterSchema = z.object({
    allow: z.array(z.string()).default([]),
    block: z.array(z.string()).default([]),
    always_allow: z.array(z.string()).optional(),
    block_hard: z.array(z.string()).optional()
});
const ScanConfigSchema = z.object({
    concurrency: z.number().int().positive().max(50).default(8),
    max_age_days: z.number().int().positive().default(30),
    experience_stretch_years: z.number().int().nonnegative().default(2),
    title_filter: TitleFilterSchema.default({ positive: [], negative: [] }),
    location_filter: LocationFilterSchema.default({ allow: [], block: [] }),
    experience_max_years: z.number().int().positive().default(15)
});
const CompanySchema = z.object({
    name: z.string().min(1),
    provider: z.string().optional(),
    provider_id: z.string().optional(),
    careers_url: z.string().url().optional(),
    enabled: z.boolean().default(true),
    title_filter_positive: z.array(z.string()).optional(),
    title_filter_negative: z.array(z.string()).optional(),
    location_allow: z.array(z.string()).optional(),
    location_block: z.array(z.string()).optional(),
    experience_max_years: z.number().int().positive().optional()
});
const UserConfigSchema = z.object({
    data_dir: z.string().default(() => join(homedir(), '.local', 'share', 'career-ops')),
    output_dir: z.string().default(() => join(homedir(), '.local', 'share', 'career-ops', 'output')),
    scan: ScanConfigSchema.default({}),
    companies: z.array(CompanySchema).default([])
});
const DEFAULT_CONFIG = {
    data_dir: join(homedir(), '.local', 'share', 'career-ops'),
    output_dir: join(homedir(), '.local', 'share', 'career-ops', 'output'),
    scan: {
        concurrency: 8,
        max_age_days: 30,
        experience_stretch_years: 2,
        title_filter: { positive: [], negative: [] },
        location_filter: { allow: [], block: [] },
        experience_max_years: 15
    },
    companies: []
};
export class ConfigLoader {
    config = null;
    configPath;
    constructor(configPath) {
        // Priority: explicit path > env var > default locations
        this.configPath = configPath ||
            process.env.CAREER_OPS_CONFIG ||
            join(homedir(), '.config', 'career-ops', 'user.yml') ||
            join(__dirname, '..', '..', 'config', 'user.yml');
    }
    load() {
        if (this.config)
            return this.config;
        // Start with defaults
        let config = { ...DEFAULT_CONFIG };
        // Load from YAML file if exists
        if (existsSync(this.configPath)) {
            try {
                const fileContent = readFileSync(this.configPath, 'utf-8');
                const fileConfig = yaml.load(fileContent);
                if (fileConfig) {
                    config = this.deepMerge(config, fileConfig);
                }
            }
            catch (error) {
                console.warn(`Failed to load config from ${this.configPath}:`, error);
            }
        }
        // Apply environment variable overrides
        config = this.applyEnvOverrides(config);
        // Validate with Zod
        const result = UserConfigSchema.safeParse(config);
        if (!result.success) {
            const errors = result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('\n');
            throw new Error(`Invalid configuration:\n${errors}`);
        }
        this.config = result.data;
        return this.config;
    }
    getConfig() {
        if (!this.config)
            return this.load();
        return this.config;
    }
    getScanConfig() {
        return this.getConfig().scan;
    }
    getCompanies() {
        return this.getConfig().companies;
    }
    getDataDir() {
        return this.getConfig().data_dir;
    }
    getOutputDir() {
        return this.getConfig().output_dir;
    }
    deepMerge(target, source) {
        const result = { ...target };
        for (const key of Object.keys(source)) {
            if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                result[key] = this.deepMerge(target[key] || {}, source[key]);
            }
            else {
                result[key] = source[key];
            }
        }
        return result;
    }
    applyEnvOverrides(config) {
        const result = { ...config };
        // Data directory
        if (process.env.CAREER_OPS_DATA_DIR) {
            result.data_dir = process.env.CAREER_OPS_DATA_DIR;
        }
        // Output directory
        if (process.env.CAREER_OPS_OUTPUT_DIR) {
            result.output_dir = process.env.CAREER_OPS_OUTPUT_DIR;
        }
        // Scan config overrides
        if (process.env.CAREER_OPS_CONCURRENCY) {
            result.scan.concurrency = parseInt(process.env.CAREER_OPS_CONCURRENCY, 10);
        }
        if (process.env.CAREER_OPS_MAX_AGE_DAYS) {
            result.scan.max_age_days = parseInt(process.env.CAREER_OPS_MAX_AGE_DAYS, 10);
        }
        if (process.env.CAREER_OPS_EXPERIENCE_STRETCH) {
            result.scan.experience_stretch_years = parseInt(process.env.CAREER_OPS_EXPERIENCE_STRETCH, 10);
        }
        return result;
    }
    // Convert to ProviderEntry format for scanner
    getProviderEntries() {
        return this.getCompanies().map(c => ({
            name: c.name,
            provider: c.provider || '',
            provider_id: c.provider_id || '',
            careers_url: c.careers_url || '',
            enabled: c.enabled,
            title_filter_positive: c.title_filter_positive,
            title_filter_negative: c.title_filter_negative,
            location_allow: c.location_allow,
            location_block: c.location_block,
            experience_max_years: c.experience_max_years
        }));
    }
}
// Singleton instance
let configInstance = null;
export function getConfig(configPath) {
    if (!configInstance) {
        configInstance = new ConfigLoader(configPath);
    }
    return configInstance;
}
export function resetConfig() {
    configInstance = null;
}
//# sourceMappingURL=config.js.map