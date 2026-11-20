/**
 * BambooHR provider - Popular SME ATS
 */
import { BaseProvider } from './base.js';
export class BambooHRProvider extends BaseProvider {
    id = 'bamboohr';
    name = 'BambooHR';
    async detect(entry) {
        if (entry.provider === 'bamboohr')
            return true;
        if (!entry.careers_url)
            return false;
        try {
            const url = new URL(entry.careers_url);
            return url.hostname.includes('bamboohr');
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
            const apiUrl = `${baseUrl}/jobs.json`;
            const response = await ctx.http.get(apiUrl, `bamboohr:${entry.provider_id}`);
            if (response.status !== 200)
                return [];
            const data = JSON.parse(response.data);
            for (const job of data.result || []) {
                jobs.push(this.mapJob(job, entry, baseUrl));
            }
        }
        catch (error) {
            console.warn(`⚠️  BambooHR: Error fetching for ${entry.name}: ${error.message}`);
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
            return `https://${entry.provider_id}.bamboohr.com`;
        }
        return null;
    }
    mapJob(job, entry, baseUrl) {
        const location = job.location?.city || job.location || '';
        const description = job.description || '';
        const experience = this.extractExperience(description);
        return {
            title: job.title || 'Untitled Position',
            url: job.applyUrl || job.url || `${baseUrl}/jobs/view/${job.id}`,
            company: entry.name,
            location,
            description,
            posted_date: this.parsePostedDate(job.publishedOn),
            salary_min: undefined,
            salary_max: undefined,
            salary_currency: 'USD',
            experience_min: experience?.min,
            experience_max: experience?.max,
            remote_type: this.determineRemoteType(location),
            employment_type: job.type,
            tags: this.extractSkills(description, this.getSkillKeywords()),
            metadata: {
                bamboohr_id: job.id
            }
        };
    }
    getSkillKeywords() {
        return ['Java', 'Python', 'JavaScript', 'React', 'Node.js', 'AWS', 'SQL'];
    }
}
export default new BambooHRProvider();
//# sourceMappingURL=bamboohr.js.map