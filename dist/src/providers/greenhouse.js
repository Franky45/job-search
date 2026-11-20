/**
 * Greenhouse provider - Popular global ATS
 */
import { BaseProvider } from './base.js';
export class GreenhouseProvider extends BaseProvider {
    id = 'greenhouse';
    name = 'Greenhouse';
    async detect(entry) {
        if (entry.provider === 'greenhouse')
            return true;
        if (!entry.careers_url && !entry.provider_id)
            return false;
        if (entry.careers_url) {
            try {
                const url = new URL(entry.careers_url);
                return url.hostname.includes('greenhouse') ||
                    url.pathname.includes('greenhouse');
            }
            catch { }
        }
        return !!entry.provider_id;
    }
    async fetch(entry, ctx) {
        const boardToken = entry.provider_id || this.extractBoardToken(entry);
        if (!boardToken) {
            console.warn(`⚠️  Greenhouse: No board token for ${entry.name}`);
            return [];
        }
        const jobs = [];
        try {
            const apiUrl = `https://boards-api.greenhouse.io/v1/boards/${boardToken}/jobs?content=true`;
            const response = await ctx.http.get(apiUrl, `greenhouse:${boardToken}`);
            if (response.status !== 200) {
                if (response.status === 404) {
                    // Try alternative: boards.greenhouse.io
                    return this.fetchFromBoard(entry, ctx);
                }
                return [];
            }
            const data = JSON.parse(response.data);
            for (const job of data.jobs || []) {
                jobs.push(this.mapJob(job, entry, boardToken));
            }
        }
        catch (error) {
            console.warn(`⚠️  Greenhouse: Error fetching for ${entry.name}: ${error.message}`);
        }
        return jobs;
    }
    async fetchFromBoard(entry, ctx) {
        const boardToken = entry.provider_id;
        if (!boardToken)
            return [];
        const jobs = [];
        try {
            // Try the embed endpoint
            const apiUrl = `https://boards-api.greenhouse.io/v1/boards/${boardToken}/embed/jobs`;
            const response = await ctx.http.get(apiUrl, `greenhouse:embed:${boardToken}`);
            if (response.status === 200) {
                const data = JSON.parse(response.data);
                for (const job of data.jobs || []) {
                    jobs.push(this.mapJob(job, entry, boardToken));
                }
            }
        }
        catch { }
        return jobs;
    }
    extractBoardToken(entry) {
        if (entry.provider_id)
            return entry.provider_id;
        if (entry.careers_url) {
            const match = entry.careers_url.match(/greenhouse\.io\/([^\/]+)/i) ||
                entry.careers_url.match(/boards\.greenhouse\.io\/([^\/]+)/i);
            return match ? match[1] : null;
        }
        return null;
    }
    mapJob(job, entry, boardToken) {
        const location = job.location?.name || '';
        const description = job.content || job.description || '';
        const experience = this.extractExperience(description);
        return {
            title: job.title || 'Untitled Position',
            url: job.absolute_url || `https://boards.greenhouse.io/${boardToken}/jobs/${job.id}`,
            company: entry.name,
            location,
            description,
            posted_date: this.parsePostedDate(job.updated_at || job.created_at),
            salary_min: job.salary_min,
            salary_max: job.salary_max,
            salary_currency: job.salary_currency || 'USD',
            experience_min: experience?.min,
            experience_max: experience?.max,
            remote_type: this.determineRemoteType(location),
            employment_type: job.employment_type,
            tags: this.extractSkills(description, this.getSkillKeywords()),
            metadata: {
                greenhouse_id: job.id,
                department: job.departments?.[0]?.name,
                offices: job.offices?.map((o) => o.name).join(', ')
            }
        };
    }
    getSkillKeywords() {
        return [
            'Java', 'Python', 'JavaScript', 'TypeScript', 'React', 'Angular', 'Node.js',
            'Go', 'Rust', 'C++', 'AWS', 'GCP', 'Kubernetes', 'Docker', 'SQL', 'NoSQL'
        ];
    }
}
export default new GreenhouseProvider();
//# sourceMappingURL=greenhouse.js.map