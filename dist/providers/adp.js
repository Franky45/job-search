/**
 * ADP provider - Enterprise payroll/ATS
 */
import { BaseProvider } from './base.js';
export class AdpProvider extends BaseProvider {
    id = 'adp';
    name = 'ADP';
    async detect(entry) {
        if (entry.provider === 'adp' || entry.provider === 'adp-myjobs' || entry.provider === 'adp-workforcenow')
            return true;
        if (!entry.careers_url)
            return false;
        try {
            const url = new URL(entry.careers_url);
            return url.hostname.includes('adp') ||
                url.hostname.includes('myadp');
        }
        catch {
            return false;
        }
    }
    async fetch(entry, ctx) {
        const baseUrl = this.getBaseUrl(entry);
        if (!baseUrl)
            return [];
        const jobs = [];
        try {
            // ADP often uses a careers portal with JSON API
            const apiUrl = `${baseUrl}/api/v1/jobs`;
            const response = await ctx.http.get(apiUrl, `adp:${entry.provider_id}`);
            if (response.status === 200) {
                const data = JSON.parse(response.data);
                for (const job of data.jobs || data.data || []) {
                    jobs.push(this.mapJob(job, entry, baseUrl));
                }
            }
        }
        catch (error) {
            console.warn(`⚠️  ADP: Error fetching for ${entry.name}: ${error.message}`);
        }
        return jobs;
    }
    getBaseUrl(entry) {
        if (entry.careers_url) {
            try {
                const url = new URL(entry.careers_url);
                return `${url.protocol}//${url.hostname}`;
            }
            catch { }
        }
        if (entry.provider_id) {
            return `https://${entry.provider_id}.adp.com`;
        }
        return null;
    }
    mapJob(job, entry, baseUrl) {
        const location = job.location || '';
        const description = job.description || '';
        const experience = this.extractExperience(description);
        return {
            title: job.title || job.jobTitle || 'Untitled Position',
            url: job.applyUrl || job.url || `${baseUrl}/jobs/${job.id}`,
            company: entry.name,
            location,
            description,
            posted_date: this.parsePostedDate(job.postedDate),
            salary_min: job.salaryMin,
            salary_max: job.salaryMax,
            salary_currency: job.currency || 'USD',
            experience_min: experience?.min,
            experience_max: experience?.max,
            remote_type: this.determineRemoteType(location),
            employment_type: job.employmentType,
            tags: this.extractSkills(description, this.getSkillKeywords()),
            metadata: {
                adp_id: job.id
            }
        };
    }
    getSkillKeywords() {
        return ['Java', 'Python', 'C#', '.NET', 'JavaScript', 'React', 'AWS', 'SQL', 'Oracle'];
    }
}
export default new AdpProvider();
//# sourceMappingURL=adp.js.map