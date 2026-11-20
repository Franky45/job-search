/**
 * Keka provider - Popular Indian HR/ATS for SMEs and startups
 * Used by: 10,000+ companies in India
 */
import { BaseProvider } from './base.js';
export class KekaProvider extends BaseProvider {
    id = 'keka';
    name = 'Keka';
    async detect(entry) {
        if (entry.provider === 'keka')
            return true;
        if (!entry.careers_url)
            return false;
        try {
            const url = new URL(entry.careers_url);
            return url.hostname.includes('keka') ||
                url.pathname.includes('keka') ||
                url.hostname.endsWith('.keka.com');
        }
        catch {
            return false;
        }
    }
    async fetch(entry, ctx) {
        const baseUrl = this.getBaseUrl(entry);
        if (!baseUrl) {
            console.warn(`⚠️  Keka: Could not determine base URL for ${entry.name}`);
            return [];
        }
        const jobs = [];
        try {
            // Keka uses a simple JSON endpoint for careers
            const apiUrl = `${baseUrl}/api/careers/jobs`;
            const response = await ctx.http.get(apiUrl, `keka:${entry.provider_id}`);
            if (response.status !== 200) {
                // Try alternative
                return this.fetchAlternative(entry, ctx);
            }
            const data = JSON.parse(response.data);
            const jobList = data.jobs || data.data || data || [];
            for (const job of jobList) {
                jobs.push(this.mapJob(job, entry, baseUrl));
            }
        }
        catch (error) {
            console.warn(`⚠️  Keka: Error fetching for ${entry.name}: ${error.message}`);
        }
        return jobs;
    }
    async fetchAlternative(entry, ctx) {
        const baseUrl = this.getBaseUrl(entry);
        if (!baseUrl)
            return [];
        const jobs = [];
        try {
            // Try the careers page HTML and parse JSON-LD
            const htmlUrl = `${baseUrl}/careers`;
            const response = await ctx.http.get(htmlUrl, `keka:html:${entry.provider_id}`);
            if (response.status === 200) {
                // Extract JSON-LD JobPosting schema
                const jsonLdJobs = this.extractJsonLd(response.data);
                for (const job of jsonLdJobs) {
                    jobs.push(this.mapJsonLdJob(job, entry, baseUrl));
                }
            }
        }
        catch (error) {
            console.warn(`⚠️  Keka HTML parse failed for ${entry.name}: ${error.message}`);
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
            return `https://${entry.provider_id}.keka.com`;
        }
        const slug = entry.name.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '');
        return `https://${slug}.keka.com`;
    }
    mapJob(job, entry, baseUrl) {
        const location = job.location || job.jobLocation || job.city;
        const description = job.description || job.jobDescription || '';
        const experience = this.extractExperience(description);
        return {
            title: job.title || job.jobTitle || job.name || 'Untitled Position',
            url: job.applyUrl || job.url || `${baseUrl}/careers/${job.slug || job.id}`,
            company: entry.name,
            location,
            description,
            posted_date: this.parsePostedDate(job.postedDate || job.createdAt || job.updatedAt),
            salary_min: job.salaryMin || job.minSalary,
            salary_max: job.salaryMax || job.maxSalary,
            salary_currency: job.salaryCurrency || 'INR',
            experience_min: experience?.min || job.experienceMin || job.minExperience,
            experience_max: experience?.max || job.experienceMax || job.maxExperience,
            remote_type: this.determineRemoteType(location),
            employment_type: job.employmentType || job.jobType,
            tags: this.extractSkills(description, this.getSkillKeywords()),
            metadata: {
                keka_id: job.id || job.jobId,
                department: job.department,
                requisition_id: job.requisitionId
            }
        };
    }
    extractJsonLd(html) {
        const jobs = [];
        const scriptRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
        let match;
        while ((match = scriptRegex.exec(html)) !== null) {
            try {
                const data = JSON.parse(match[1].trim());
                const items = Array.isArray(data) ? data : [data];
                for (const item of items) {
                    if (item['@type'] === 'JobPosting' || item['@type'] === 'Job') {
                        jobs.push(item);
                    }
                }
            }
            catch { }
        }
        return jobs;
    }
    mapJsonLdJob(job, entry, baseUrl) {
        const location = job.jobLocation?.address?.addressLocality || job.jobLocation?.address?.addressRegion || job.location;
        const description = job.description || '';
        return {
            title: job.title || job.name || 'Untitled Position',
            url: job.url || job.applyUrl || `${baseUrl}/careers`,
            company: entry.name,
            location,
            description,
            posted_date: this.parsePostedDate(job.datePosted || job.validThrough),
            salary_min: job.baseSalary?.value?.minValue,
            salary_max: job.baseSalary?.value?.maxValue,
            salary_currency: job.baseSalary?.currency || 'INR',
            experience_min: undefined,
            experience_max: undefined,
            remote_type: this.determineRemoteType(location || ''),
            employment_type: job.employmentType,
            tags: this.extractSkills(description, this.getSkillKeywords()),
            metadata: {
                json_ld: true
            }
        };
    }
    getSkillKeywords() {
        return [
            'Java', 'Python', 'JavaScript', 'TypeScript', 'React', 'Angular', 'Vue',
            'Node.js', 'Spring', 'Spring Boot', 'Django', 'Flask', 'FastAPI',
            'AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes', 'Terraform',
            'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'Kafka', 'RabbitMQ',
            'Microservices', 'REST', 'GraphQL', 'gRPC', 'SQL', 'NoSQL',
            'CI/CD', 'Jenkins', 'GitLab', 'GitHub Actions', 'ArgoCD'
        ];
    }
}
export default new KekaProvider();
//# sourceMappingURL=keka.js.map