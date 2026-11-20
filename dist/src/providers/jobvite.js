/**
 * Jobvite provider - Enterprise ATS
 */
import { BaseProvider } from './base.js';
export class JobviteProvider extends BaseProvider {
    id = 'jobvite';
    name = 'Jobvite';
    async detect(entry) {
        if (entry.provider === 'jobvite')
            return true;
        if (!entry.careers_url)
            return false;
        try {
            const url = new URL(entry.careers_url);
            return url.hostname.includes('jobvite');
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
            const apiUrl = `${baseUrl}/api/v2/jobs`;
            const response = await ctx.http.get(apiUrl, `jobvite:${entry.provider_id}`);
            if (response.status !== 200)
                return [];
            const data = JSON.parse(response.data);
            for (const job of data.jobs || []) {
                jobs.push(this.mapJob(job, entry, baseUrl));
            }
        }
        catch (error) {
            console.warn(`⚠️  Jobvite: Error fetching for ${entry.name}: ${error.message}`);
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
            return `https://jobs.jobvite.com/${entry.provider_id}`;
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
            employment_type: job.type,
            tags: this.extractSkills(description, this.getSkillKeywords()),
            metadata: {
                jobvite_id: job.id
            }
        };
    }
    getSkillKeywords() {
        return ['Java', 'Python', 'C#', '.NET', 'JavaScript', 'React', 'AWS', 'SQL'];
    }
}
export default new JobviteProvider();
//# sourceMappingURL=jobvite.js.map