/**
 * Freshteam provider - Freshworks ATS platform
 * Used by: 5,000+ companies globally, popular in India
 */
import { BaseProvider } from './base.js';
export class FreshteamProvider extends BaseProvider {
    id = 'freshteam';
    name = 'Freshteam';
    async detect(entry) {
        if (entry.provider === 'freshteam')
            return true;
        if (!entry.careers_url)
            return false;
        try {
            const url = new URL(entry.careers_url);
            return url.hostname.includes('freshteam') ||
                url.hostname.endsWith('.freshteam.com') ||
                url.pathname.includes('freshteam');
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
            // Freshteam public API endpoint
            const apiUrl = `${baseUrl}/jobs.json`;
            const response = await ctx.http.get(apiUrl, `freshteam:${entry.provider_id}`);
            if (response.status === 200) {
                const data = JSON.parse(response.data);
                const jobList = data.jobs || data || [];
                for (const job of jobList) {
                    jobs.push(this.mapJob(job, entry, baseUrl));
                }
            }
        }
        catch (error) {
            console.warn(`⚠️  Freshteam: Error fetching for ${entry.name}: ${error.message}`);
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
            return `https://${entry.provider_id}.freshteam.com`;
        }
        const slug = entry.name.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '');
        return `https://${slug}.freshteam.com`;
    }
    mapJob(job, entry, baseUrl) {
        const location = job.location || job.job_location;
        const description = job.description || job.description_text || '';
        const experience = this.extractExperience(description);
        return {
            title: job.title || job.name || 'Untitled Position',
            url: job.url || job.apply_url || `${baseUrl}/jobs/${job.id}`,
            company: entry.name,
            location,
            description,
            description_html: job.description_html,
            posted_date: this.parsePostedDate(job.published_at || job.created_at || job.updated_at),
            salary_min: job.salary_min,
            salary_max: job.salary_max,
            salary_currency: job.salary_currency || 'INR',
            experience_min: experience?.min || job.min_experience,
            experience_max: experience?.max || job.max_experience,
            remote_type: this.determineRemoteType(location || ''),
            employment_type: job.employment_type,
            tags: this.extractSkills(description, this.getSkillKeywords()),
            metadata: {
                freshteam_id: job.id,
                department: job.department
            }
        };
    }
    getSkillKeywords() {
        return [
            'Java', 'Python', 'JavaScript', 'TypeScript', 'React', 'Angular', 'Vue',
            'Node.js', 'Spring', 'Spring Boot', 'Django', 'Flask', 'FastAPI',
            'AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes', 'Terraform',
            'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'Kafka', 'RabbitMQ',
            'Microservices', 'REST', 'GraphQL', 'gRPC', 'SQL', 'NoSQL'
        ];
    }
}
export default new FreshteamProvider();
//# sourceMappingURL=freshteam.js.map