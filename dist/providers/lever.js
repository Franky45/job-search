/**
 * Lever provider - Popular ATS for tech companies
 */
import { BaseProvider } from './base.js';
export class LeverProvider extends BaseProvider {
    id = 'lever';
    name = 'Lever';
    async detect(entry) {
        if (entry.provider === 'lever')
            return true;
        if (!entry.careers_url && !entry.provider_id)
            return false;
        if (entry.careers_url) {
            try {
                const url = new URL(entry.careers_url);
                return url.hostname.includes('lever') ||
                    url.pathname.includes('lever');
            }
            catch { }
        }
        return !!entry.provider_id;
    }
    async fetch(entry, ctx) {
        const boardToken = entry.provider_id || this.extractBoardToken(entry);
        if (!boardToken) {
            console.warn(`⚠️  Lever: No board token for ${entry.name}`);
            return [];
        }
        const jobs = [];
        try {
            const apiUrl = `https://api.lever.co/v0/postings/${boardToken}?mode=json`;
            const response = await ctx.http.get(apiUrl, `lever:${boardToken}`);
            if (response.status !== 200)
                return [];
            const data = JSON.parse(response.data);
            for (const posting of data) {
                jobs.push(this.mapPosting(posting, entry, boardToken));
            }
        }
        catch (error) {
            console.warn(`⚠️  Lever: Error fetching for ${entry.name}: ${error.message}`);
        }
        return jobs;
    }
    extractBoardToken(entry) {
        if (entry.provider_id)
            return entry.provider_id;
        if (entry.careers_url) {
            const match = entry.careers_url.match(/lever\.co\/([^\/]+)/i) ||
                entry.careers_url.match(/jobs\.lever\.co\/([^\/]+)/i);
            return match ? match[1] : null;
        }
        return null;
    }
    mapPosting(posting, entry, boardToken) {
        const location = posting.categories?.location || '';
        const description = posting.description || posting.descriptionPlain || '';
        const experience = this.extractExperience(description);
        return {
            title: posting.text || 'Untitled Position',
            url: posting.applyUrl || posting.hostedUrl || `https://jobs.lever.co/${boardToken}/${posting.id}`,
            company: entry.name,
            location,
            description,
            posted_date: this.parsePostedDate(posting.createdAt ? new Date(posting.createdAt).toISOString() : undefined),
            salary_min: undefined,
            salary_max: undefined,
            salary_currency: 'USD',
            experience_min: experience?.min,
            experience_max: experience?.max,
            remote_type: this.determineRemoteType(location),
            employment_type: posting.categories?.commitment,
            tags: this.extractSkills(description, this.getSkillKeywords()),
            metadata: {
                lever_id: posting.id,
                department: posting.categories?.department,
                team: posting.categories?.team,
                location_type: posting.workplaceType
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
export default new LeverProvider();
//# sourceMappingURL=lever.js.map