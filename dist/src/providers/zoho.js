/**
 * Zoho Recruit provider - Leading global/Indian ATS
 * Used by: 50,000+ organizations
 */
import { BaseProvider } from './base.js';
export class ZohoRecruitProvider extends BaseProvider {
    id = 'zoho-recruit';
    name = 'Zoho Recruit';
    async detect(entry) {
        if (entry.provider === 'zoho-recruit')
            return true;
        if (!entry.careers_url)
            return false;
        try {
            const url = new URL(entry.careers_url);
            return url.hostname.includes('zoho.com') ||
                url.hostname.includes('zohorecruit') ||
                url.pathname.includes('zohorecruit');
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
            // Zoho Recruit usually has a public jobs list endpoint for their widgets
            // Pattern: https://recruit.zoho.com/recruit/v2/public/Job_Openings?digest=...
            const digest = this.extractDigest(entry);
            if (digest) {
                const apiUrl = `https://recruit.zoho.com/recruit/v2/public/Job_Openings?digest=${digest}`;
                const response = await ctx.http.get(apiUrl, `zoho:${digest}`);
                if (response.status === 200) {
                    const data = JSON.parse(response.data);
                    const openings = data.data || [];
                    for (const opening of openings) {
                        jobs.push(this.mapJob(opening, entry, digest));
                    }
                }
            }
            else {
                // Try fallback to HTML parsing
                return this.fetchFromHtml(entry, ctx);
            }
        }
        catch (error) {
            console.warn(`⚠️  Zoho Recruit: Error fetching for ${entry.name}: ${error.message}`);
        }
        return jobs;
    }
    async fetchFromHtml(entry, ctx) {
        if (!entry.careers_url)
            return [];
        const jobs = [];
        try {
            const response = await ctx.http.get(entry.careers_url, `zoho:html:${entry.name}`);
            if (response.status === 200) {
                // Try to find the digest in the HTML
                const digestMatch = response.data.match(/digest=([a-zA-Z0-9_.-]+)/i) ||
                    response.data.match(/embedCode:\s*['"]([a-zA-Z0-9_.-]+)['"]/i);
                if (digestMatch) {
                    const digest = digestMatch[1];
                    const apiUrl = `https://recruit.zoho.com/recruit/v2/public/Job_Openings?digest=${digest}`;
                    const apiResponse = await ctx.http.get(apiUrl, `zoho:api:${digest}`);
                    if (apiResponse.status === 200) {
                        const data = JSON.parse(apiResponse.data);
                        const openings = data.data || [];
                        for (const opening of openings) {
                            jobs.push(this.mapJob(opening, entry, digest));
                        }
                    }
                }
            }
        }
        catch { }
        return jobs;
    }
    getBaseUrl(entry) {
        if (entry.careers_url)
            return entry.careers_url;
        if (entry.provider_id)
            return `https://recruit.zoho.com/recruit/Portal.na?digest=${entry.provider_id}`;
        return null;
    }
    extractDigest(entry) {
        if (entry.provider_id)
            return entry.provider_id;
        if (entry.careers_url) {
            const match = entry.careers_url.match(/digest=([a-zA-Z0-9_.-]+)/i);
            return match ? match[1] : null;
        }
        return null;
    }
    mapJob(job, entry, digest) {
        const title = job.Job_Opening_Name || job.Job_Title || 'Untitled Position';
        const city = job.City || '';
        const state = job.State || '';
        const country = job.Country || '';
        const location = [city, state, country].filter(Boolean).join(', ');
        const description = job.Job_Description || '';
        const experience = this.extractExperience(description);
        return {
            title,
            url: `https://recruit.zoho.com/recruit/PortalDetail.na?iframe=true&digest=${digest}&jobid=${job.Job_Opening_ID || job.id}`,
            company: entry.name,
            location,
            description,
            posted_date: this.parsePostedDate(job.Date_Opened || job.Created_Time),
            salary_min: job.Salary_Minimum || job.Salary,
            salary_max: job.Salary_Maximum,
            salary_currency: job.Currency || 'INR',
            experience_min: experience?.min || job.Work_Experience_Minimum,
            experience_max: experience?.max || job.Work_Experience_Maximum,
            remote_type: this.determineRemoteType(location + ' ' + title),
            employment_type: job.Job_Type || job.Employment_Type,
            tags: this.extractSkills(description, this.getSkillKeywords()),
            metadata: {
                zoho_id: job.Job_Opening_ID || job.id,
                department: job.Department
            }
        };
    }
    getSkillKeywords() {
        return [
            'Java', 'Python', 'JavaScript', 'TypeScript', 'React', 'Angular', 'Node.js',
            'C#', '.NET', 'PHP', 'Ruby', 'Go', 'Rust', 'Swift', 'Kotlin',
            'SQL', 'NoSQL', 'Cloud', 'AWS', 'Azure', 'GCP', 'DevOps', 'Mobile'
        ];
    }
}
export default new ZohoRecruitProvider();
//# sourceMappingURL=zoho.js.map