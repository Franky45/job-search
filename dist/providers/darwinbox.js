/**
 * Darwinbox provider - Major Indian HRMS/ATS
 * Used by: Tata, Mahindra, Aditya Birla, Godrej, 800+ companies
 */
import { BaseProvider } from './base.js';
export class DarwinboxProvider extends BaseProvider {
    id = 'darwinbox';
    name = 'Darwinbox';
    async detect(entry) {
        if (entry.provider === 'darwinbox')
            return true;
        if (!entry.careers_url)
            return false;
        try {
            const url = new URL(entry.careers_url);
            return url.hostname.includes('darwinbox') ||
                url.pathname.includes('darwinbox') ||
                url.hostname.endsWith('.darwinbox.in');
        }
        catch {
            return false;
        }
    }
    async fetch(entry, ctx) {
        const baseUrl = this.getBaseUrl(entry);
        if (!baseUrl) {
            console.warn(`⚠️  Darwinbox: Could not determine base URL for ${entry.name}`);
            return [];
        }
        const jobs = [];
        let page = 1;
        const maxPages = 50;
        let hasMore = true;
        while (hasMore && page <= maxPages) {
            try {
                const apiUrl = `${baseUrl}/api/v1/jobs?page=${page}&limit=50&status=published`;
                const response = await ctx.http.get(apiUrl, `darwinbox:${entry.provider_id}:page:${page}`);
                if (response.status !== 200) {
                    if (response.status === 404 && page === 1) {
                        // Try alternative endpoint
                        return this.fetchAlternative(entry, ctx);
                    }
                    break;
                }
                const data = JSON.parse(response.data);
                const pageJobs = data.data || data.jobs || [];
                if (pageJobs.length === 0) {
                    hasMore = false;
                    break;
                }
                for (const job of pageJobs) {
                    jobs.push(this.mapJob(job, entry));
                }
                // Check pagination
                const totalPages = data.total_pages || data.meta?.total_pages || Math.ceil((data.total || data.meta?.total || 0) / 50);
                if (page >= totalPages)
                    hasMore = false;
                page++;
            }
            catch (error) {
                console.warn(`⚠️  Darwinbox: Error fetching page ${page} for ${entry.name}: ${error.message}`);
                break;
            }
        }
        return jobs;
    }
    async fetchAlternative(entry, ctx) {
        const baseUrl = this.getBaseUrl(entry);
        if (!baseUrl)
            return [];
        const jobs = [];
        try {
            // Try GraphQL endpoint
            const graphqlUrl = `${baseUrl}/graphql`;
            const query = `
        query GetJobs($first: Int, $after: String) {
          jobs(first: $first, after: $after, filter: {status: PUBLISHED}) {
            edges {
              node {
                id
                title
                slug
                description
                location {
                  city
                  state
                  country
                }
                employmentType
                experienceMin
                experienceMax
                salaryMin
                salaryMax
                salaryCurrency
                postedAt
                applyUrl
              }
              cursor
            }
            pageInfo {
              hasNextPage
              endCursor
            }
          }
        }
      `;
            let hasNextPage = true;
            let after = null;
            while (hasNextPage) {
                const response = await ctx.http.post(graphqlUrl, {
                    query,
                    variables: { first: 50, after }
                }, `darwinbox:graphql:${entry.provider_id}:${after || 'first'}`);
                if (response.status !== 200)
                    break;
                const data = JSON.parse(response.data);
                const edges = data.data?.jobs?.edges || [];
                for (const edge of edges) {
                    jobs.push(this.mapGraphQLJob(edge.node, entry));
                }
                hasNextPage = data.data?.jobs?.pageInfo?.hasNextPage || false;
                after = data.data?.jobs?.pageInfo?.endCursor || null;
                if (!hasNextPage || jobs.length >= 1000)
                    break;
            }
        }
        catch (error) {
            console.warn(`⚠️  Darwinbox GraphQL failed for ${entry.name}: ${error.message}`);
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
        // Construct from provider_id
        if (entry.provider_id) {
            return `https://${entry.provider_id}.darwinbox.in`;
        }
        // Try common patterns
        const slug = entry.name.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '');
        return `https://${slug}.darwinbox.in`;
    }
    mapJob(job, entry) {
        const location = this.formatLocation(job.location);
        const description = job.description || job.description_html || '';
        const experience = this.extractExperience(description);
        return {
            title: job.title || job.name || 'Untitled Position',
            url: job.apply_url || job.url || `${this.getBaseUrl(entry)}/careers/${job.slug || job.id}`,
            company: entry.name,
            location,
            description,
            description_html: job.description_html,
            posted_date: this.parsePostedDate(job.posted_at || job.created_at || job.updated_at),
            salary_min: job.salary_min || job.min_salary,
            salary_max: job.salary_max || job.max_salary,
            salary_currency: job.salary_currency || 'INR',
            experience_min: experience?.min || job.experience_min || job.min_experience,
            experience_max: experience?.max || job.experience_max || job.max_experience,
            remote_type: this.determineRemoteType(location),
            employment_type: job.employment_type || job.employment_category,
            tags: this.extractSkills(description, this.getSkillKeywords()),
            metadata: {
                darwinbox_id: job.id,
                requisition_id: job.requisition_id,
                department: job.department,
                hiring_manager: job.hiring_manager
            }
        };
    }
    mapGraphQLJob(job, entry) {
        const location = job.location
            ? [job.location.city, job.location.state, job.location.country].filter(Boolean).join(', ')
            : undefined;
        const experience = this.extractExperience(job.description || '');
        return {
            title: job.title,
            url: job.applyUrl || `${this.getBaseUrl(entry)}/careers/${job.slug}`,
            company: entry.name,
            location,
            description: job.description,
            posted_date: this.parsePostedDate(job.postedAt),
            salary_min: job.salaryMin,
            salary_max: job.salaryMax,
            salary_currency: job.salaryCurrency || 'INR',
            experience_min: experience?.min || job.experienceMin,
            experience_max: experience?.max || job.experienceMax,
            remote_type: this.determineRemoteType(location || ''),
            employment_type: job.employmentType,
            tags: this.extractSkills(job.description || '', this.getSkillKeywords()),
            metadata: {
                darwinbox_id: job.id
            }
        };
    }
    formatLocation(loc) {
        if (!loc)
            return undefined;
        if (typeof loc === 'string')
            return loc;
        if (Array.isArray(loc))
            return loc.filter(Boolean).join(', ');
        const parts = [loc.city, loc.state, loc.country].filter(Boolean);
        return parts.length > 0 ? parts.join(', ') : undefined;
    }
    getSkillKeywords() {
        return [
            'Java', 'Python', 'JavaScript', 'TypeScript', 'React', 'Angular', 'Vue',
            'Node.js', 'Spring', 'Spring Boot', 'Django', 'Flask', 'FastAPI',
            'AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes', 'Terraform',
            'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'Kafka', 'RabbitMQ',
            'Microservices', 'REST', 'GraphQL', 'gRPC', 'SQL', 'NoSQL',
            'CI/CD', 'Jenkins', 'GitLab', 'GitHub Actions', 'ArgoCD',
            'Agile', 'Scrum', 'Kanban', 'JIRA', 'Confluence',
            'Machine Learning', 'Deep Learning', 'NLP', 'Computer Vision',
            'Data Science', 'Analytics', 'Tableau', 'PowerBI', 'Looker'
        ];
    }
}
export default new DarwinboxProvider();
//# sourceMappingURL=darwinbox.js.map