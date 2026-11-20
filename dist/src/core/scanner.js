/**
 * Scanner orchestration - coordinates providers, filters, and database
 */
import { getDatabase } from './database.js';
// Re-export getDatabase for use in commands
export { getDatabase } from './database.js';
import { getConfig } from './config.js';
import { resolveProvider, getProviders } from '../providers/registry.js';
import { createHttpClient, createCache, fetchWithConcurrency } from '../providers/http.js';
import { buildTitleFilter } from '../filters/title.js';
import { buildLocationFilter } from '../filters/location.js';
import { buildExperienceFilter } from '../filters/experience.js';
import { buildAgeFilter } from '../filters/age.js';
import { generateCanonicalUrl, generateFingerprint } from '../utils/dedup.js';
import ora from 'ora';
export async function runScan(options = {}) {
    const spinner = ora('Loading configuration...').start();
    const startTime = Date.now();
    const errors = [];
    try {
        // Load configuration
        const config = getConfig();
        const scanConfig = config.getScanConfig();
        const companies = options.singleCompany
            ? config.getCompanies().filter(c => c.name.toLowerCase() === options.singleCompany.toLowerCase())
            : config.getCompanies().filter(c => c.enabled);
        if (companies.length === 0) {
            spinner.warn('No companies configured to scan');
            return emptyResult(0);
        }
        spinner.text = `Loading ${companies.length} companies...`;
        // Initialize database
        const db = await getDatabase(config.getDataDir());
        // Load providers
        await getProviders();
        // Initialize HTTP client and cache
        const http = createHttpClient({
            timeout: 30000,
            retries: 3,
            retryDelay: 1000
        });
        const cache = createCache();
        // Build filters
        const titleFilter = buildTitleFilter(scanConfig.title_filter);
        const locationFilter = buildLocationFilter(scanConfig.location_filter);
        const experienceFilter = buildExperienceFilter({
            maxYears: scanConfig.experience_max_years,
            stretchYears: scanConfig.experience_stretch_years
        });
        const ageFilter = buildAgeFilter(scanConfig.max_age_days);
        // Prepare fetch context
        const fetchContext = {
            http,
            cache,
            signal: AbortSignal.none,
            concurrency: scanConfig.concurrency
        };
        spinner.text = `Scanning ${companies.length} companies...`;
        spinner.stop();
        let totalJobsFound = 0;
        let totalJobsNew = 0;
        let totalJobsFiltered = 0;
        let totalJobsDuplicate = 0;
        let companiesScanned = 0;
        // Process companies with concurrency control
        const { results, errors: fetchErrors } = await fetchWithConcurrency(companies.map(c => c.name), async (companyName) => {
            const company = companies.find(c => c.name === companyName);
            if (!company)
                return { jobs: [], filtered: 0, newJobs: 0, duplicates: 0, error: null };
            const provider = await resolveProvider(company);
            if (!provider) {
                return { jobs: [], filtered: 0, newJobs: 0, duplicates: 0, error: `No provider for ${company.name}` };
            }
            try {
                const jobs = await provider.fetch(company, fetchContext);
                let filtered = 0;
                let newJobs = 0;
                let duplicates = 0;
                for (const job of jobs) {
                    totalJobsFound++;
                    // Apply filters
                    if (!titleFilter(job.title)) {
                        filtered++;
                        continue;
                    }
                    const urlHint = job.url || '';
                    if (!locationFilter(job.location || '', urlHint)) {
                        filtered++;
                        continue;
                    }
                    const expReq = extractExperienceFromJob(job);
                    if (!experienceFilter(expReq)) {
                        filtered++;
                        continue;
                    }
                    if (!ageFilter(job.posted_date)) {
                        filtered++;
                        continue;
                    }
                    // Check deduplication
                    const canonicalUrl = generateCanonicalUrl(job.url, job.title, company.name);
                    const fingerprint = generateFingerprint(job.title, company.name, job.location || '', job.description || '');
                    const existing = db.getJobByCanonicalUrl(canonicalUrl);
                    if (existing) {
                        duplicates++;
                        continue;
                    }
                    // Insert new job
                    if (!options.dryRun) {
                        const jobRecord = {
                            canonical_url: canonicalUrl,
                            source_url: job.url,
                            provider: provider.id,
                            company: company.name,
                            company_slug: company.provider_id || company.name.toLowerCase().replace(/\s+/g, '-'),
                            title: job.title,
                            location: job.location,
                            description: job.description,
                            description_html: job.description_html,
                            posted_date: job.posted_date,
                            discovered_date: new Date().toISOString(),
                            salary_min: job.salary_min,
                            salary_max: job.salary_max,
                            salary_currency: job.salary_currency,
                            experience_min: job.experience_min ?? expReq?.min,
                            experience_max: job.experience_max ?? expReq?.max,
                            remote_type: job.remote_type,
                            employment_type: job.employment_type,
                            tags: job.tags,
                            status: 'new'
                        };
                        db.insertJob(jobRecord);
                    }
                    newJobs++;
                    totalJobsNew++;
                }
                totalJobsFiltered += filtered;
                totalJobsDuplicate += duplicates;
                return { jobs, filtered, newJobs, duplicates, error: null };
            }
            catch (error) {
                return { jobs: [], filtered: 0, newJobs: 0, duplicates: 0, error: `${company.name}: ${error.message}` };
            }
        }, scanConfig.concurrency);
        // Collect errors
        for (const [company, error] of fetchErrors) {
            errors.push(`${company}: ${error.message}`);
        }
        companiesScanned = companies.length;
        // Record scan run
        const durationMs = Date.now() - startTime;
        if (!options.dryRun) {
            const scanRun = {
                run_date: new Date().toISOString(),
                companies_scanned: companiesScanned,
                jobs_found: totalJobsFound,
                jobs_new: totalJobsNew,
                jobs_filtered: totalJobsFiltered,
                duration_ms: durationMs,
                errors: errors.length > 0 ? JSON.stringify(errors) : undefined
            };
            db.insertScanRun(scanRun);
        }
        return {
            companiesScanned,
            jobsFound: totalJobsFound,
            jobsNew: totalJobsNew,
            jobsFiltered: totalJobsFiltered,
            jobsDuplicate: totalJobsDuplicate,
            durationMs,
            errors
        };
    }
    catch (error) {
        spinner.fail('Scan failed');
        throw error;
    }
}
function extractExperienceFromJob(job) {
    if (job.experience_min !== undefined && job.experience_max !== undefined) {
        return { min: job.experience_min, max: job.experience_max };
    }
    if (job.experience_min !== undefined) {
        return { min: job.experience_min };
    }
    if (job.description) {
        // Try to extract from description
        const patterns = [
            /(\d+)\s*[\-–]\s*(\d+)\s*(?:years?|yrs?)/gi,
            /(\d+)\s*\+\s*(?:years?|yrs?)/gi,
            /minimum\s+(\d+)\s*(?:years?|yrs?)/gi,
            /(\d+)\s*(?:years?|yrs?)\s*(?:of\s+)?experience/gi
        ];
        for (const pattern of patterns) {
            const match = pattern.exec(job.description || '');
            if (match) {
                if (match[2]) {
                    return { min: parseInt(match[1], 10), max: parseInt(match[2], 10) };
                }
                return { min: parseInt(match[1], 10) };
            }
        }
    }
    return null;
}
function emptyResult(startTime) {
    return {
        companiesScanned: 0,
        jobsFound: 0,
        jobsNew: 0,
        jobsFiltered: 0,
        jobsDuplicate: 0,
        durationMs: Date.now() - startTime,
        errors: []
    };
}
//# sourceMappingURL=scanner.js.map