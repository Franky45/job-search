/**
 * iCIMS provider - Enterprise ATS
 */
import { BaseProvider } from './base.js';
export class IcimsProvider extends BaseProvider {
    id = 'icims';
    name = 'iCIMS';
    async detect(entry) {
        if (entry.provider === 'icims')
            return true;
        if (!entry.careers_url)
            return false;
        try {
            const url = new URL(entry.careers_url);
            return url.hostname.includes('icims') ||
                url.pathname.includes('icims');
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
            // iCIMS typically uses a search API
            const apiUrl = `${baseUrl}/search/api/v1/jobs?page=1&per_page=100`;
            const response = await ctx.http.get(apiUrl, `icims:${entry.provider_id}`);
            if (response.status !== 200)
                return [];
            const data = JSON.parse(response.data);
            for (const job of data.jobs || []) {
                jobs.push(this.mapJob(job, entry, baseUrl));
            }
        }
        catch (error) {
            console.warn(`⚠️  iCIMS: Error fetching for ${entry.name}: ${error.message}`);
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
            return `https://careers-${entry.provider_id}.icims.com`;
        }
        return null;
    }
    mapJob(job, entry, baseUrl) {
        const location = job.location || '';
        const description = job.description || '';
        const experience = this.extractExperience(description);
        return {
            title: job.title || 'Untitled Position',
            url: job.applyUrl || job.url || `${baseUrl}/jobs/${job.id}`,
            company: entry.name,
            location,
            description,
            posted_date: this.parsePostedDate(job.postedDate),
            salary_min: undefined,
            salary_max: undefined,
            salary_currency: 'USD',
            experience_min: experience?.min,
            experience_max: experience?.max,
            remote_type: this.determineRemoteType(location),
            employment_type: job.jobType,
            tags: this.extractSkills(description, this.getSkillKeywords()),
            metadata: {
                icims_id: job.id,
                requisition_id: job.requisitionId
            }
        };
    }
    getSkillKeywords() {
        return [
            'Java', 'Python', 'C#', '.NET', 'JavaScript', 'React', 'Angular',
            'AWS', 'Azure', 'SQL', 'Oracle', 'SAP', 'Salesforce'
        ];
    }
}
export default new IcimsProvider();
//# sourceMappingURL=icims.js.map