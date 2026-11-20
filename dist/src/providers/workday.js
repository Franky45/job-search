/**
 * Workday provider - Enterprise ATS
 */
import { BaseProvider } from './base.js';
export class WorkdayProvider extends BaseProvider {
    id = 'workday';
    name = 'Workday';
    async detect(entry) {
        if (entry.provider === 'workday')
            return true;
        if (!entry.careers_url)
            return false;
        try {
            const url = new URL(entry.careers_url);
            return url.hostname.includes('workday') ||
                url.pathname.includes('workday') ||
                url.hostname.includes('myworkdayjobs');
        }
        catch {
            return false;
        }
    }
    async fetch(entry, ctx) {
        const tenant = this.extractTenant(entry);
        if (!tenant)
            return [];
        const jobs = [];
        try {
            // Workday uses a specific API pattern
            const apiUrl = `https://${tenant}.wd1.myworkdayjobs.com/wday/cxs/${tenant}/External/jobs`;
            const response = await ctx.http.post(apiUrl, {
                appliedFacets: {},
                limit: 100,
                offset: 0,
                searchText: ''
            }, `workday:${tenant}`);
            if (response.status !== 200)
                return [];
            const data = JSON.parse(response.data);
            for (const posting of data.jobPostings || []) {
                jobs.push(this.mapPosting(posting, entry, tenant));
            }
        }
        catch (error) {
            console.warn(`⚠️  Workday: Error fetching for ${entry.name}: ${error.message}`);
        }
        return jobs;
    }
    extractTenant(entry) {
        if (entry.provider_id)
            return entry.provider_id;
        if (entry.careers_url) {
            const match = entry.careers_url.match(/myworkdayjobs\.com\/([^\/]+)/i) ||
                entry.careers_url.match(/workday\.com\/([^\/]+)/i);
            return match ? match[1] : null;
        }
        return null;
    }
    mapPosting(posting, entry, tenant) {
        const location = posting.locationsText || '';
        const description = ''; // Workday requires separate call for description
        const experience = this.extractExperience(posting.jobDescription || '');
        return {
            title: posting.title || 'Untitled Position',
            url: `https://${tenant}.wd1.myworkdayjobs.com${posting.externalPath || ''}`,
            company: entry.name,
            location,
            description,
            posted_date: this.parsePostedDate(posting.postedOn),
            salary_min: undefined,
            salary_max: undefined,
            salary_currency: 'USD',
            experience_min: experience?.min,
            experience_max: experience?.max,
            remote_type: this.determineRemoteType(location),
            employment_type: posting.jobType,
            tags: this.extractSkills(posting.jobDescription || '', this.getSkillKeywords()),
            metadata: {
                workday_id: posting.jobReqId || posting.id,
                locations: posting.locationsText,
                job_family: posting.jobFamily
            }
        };
    }
    getSkillKeywords() {
        return [
            'Java', 'Python', 'JavaScript', 'TypeScript', 'React', 'Angular', 'Node.js',
            'C#', '.NET', 'SAP', 'Oracle', 'Salesforce', 'AWS', 'Azure', 'SQL'
        ];
    }
}
export default new WorkdayProvider();
//# sourceMappingURL=workday.js.map