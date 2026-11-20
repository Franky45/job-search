/**
 * SumHR provider - Indian HRMS
 * Used by: Indian SMEs
 */

import { BaseProvider } from './base.js';
import { ProviderEntry, ProviderJob, FetchContext } from '../core/models.js';

export class SumHRProvider extends BaseProvider {
  readonly id = 'sumhr';
  readonly name = 'SumHR';

  async detect(entry: ProviderEntry): Promise<boolean> {
    if (entry.provider === 'sumhr') return true;
    if (!entry.careers_url) return false;

    try {
      const url = new URL(entry.careers_url);
      return url.hostname.includes('sumhr');
    } catch {
      return false;
    }
  }

  async fetch(entry: ProviderEntry, ctx: FetchContext): Promise<ProviderJob[]> {
    const baseUrl = this.getBaseUrl(entry);
    if (!baseUrl) return [];

    const jobs: ProviderJob[] = [];

    try {
      const apiUrl = `${baseUrl}/api/careers/jobs`;
      const response = await ctx.http.get(apiUrl, `sumhr:${entry.provider_id}`);

      if (response.status === 200) {
        const data = JSON.parse(response.data);
        for (const job of data.jobs || data.data || []) {
          jobs.push(this.mapJob(job, entry, baseUrl));
        }
      }
    } catch (error) {
      console.warn(`⚠️  SumHR: Error fetching for ${entry.name}: ${(error as Error).message}`);
    }

    return jobs;
  }

  private getBaseUrl(entry: ProviderEntry): string | null {
    if (entry.careers_url) {
      try {
        const url = new URL(entry.careers_url);
        return `${url.protocol}//${url.hostname}`;
      } catch {}
    }
    if (entry.provider_id) {
      return `https://${entry.provider_id}.sumhr.com`;
    }
    return null;
  }

  private mapJob(job: any, entry: ProviderEntry, baseUrl: string): ProviderJob {
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
      salary_min: job.salaryMin,
      salary_max: job.salaryMax,
      salary_currency: job.currency || 'INR',
      experience_min: experience?.min,
      experience_max: experience?.max,
      remote_type: this.determineRemoteType(location),
      employment_type: job.employmentType,
      tags: this.extractSkills(description, this.getSkillKeywords()),
      metadata: { sumhr_id: job.id }
    };
  }

  private getSkillKeywords(): string[] {
    return ['Java', 'Python', 'JavaScript', 'React', 'Node.js', 'AWS', 'SQL'];
  }
}

export default new SumHRProvider();