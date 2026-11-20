/**
 * ADP provider - Enterprise payroll/ATS
 */

import { BaseProvider } from './base.js';
import { ProviderEntry, ProviderJob, FetchContext } from '../core/models.js';

export class AdpProvider extends BaseProvider {
  readonly id = 'adp';
  readonly name = 'ADP';

  async detect(entry: ProviderEntry): Promise<boolean> {
    if (entry.provider === 'adp' || entry.provider === 'adp-myjobs' || entry.provider === 'adp-workforcenow') return true;
    if (!entry.careers_url) return false;

    try {
      const url = new URL(entry.careers_url);
      return url.hostname.includes('adp') ||
             url.hostname.includes('myadp');
    } catch {
      return false;
    }
  }

  async fetch(entry: ProviderEntry, ctx: FetchContext): Promise<ProviderJob[]> {
    const baseUrl = this.getBaseUrl(entry);
    if (!baseUrl) return [];

    const jobs: ProviderJob[] = [];

    try {
      // ADP often uses a careers portal with JSON API
      const apiUrl = `${baseUrl}/api/v1/jobs`;
      const response = await ctx.http.get(apiUrl, `adp:${entry.provider_id}`);

      if (response.status === 200) {
        const data = JSON.parse(response.data);
        for (const job of data.jobs || data.data || []) {
          jobs.push(this.mapJob(job, entry, baseUrl));
        }
      }
    } catch (error) {
      console.warn(`⚠️  ADP: Error fetching for ${entry.name}: ${(error as Error).message}`);
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
      return `https://${entry.provider_id}.adp.com`;
    }
    return null;
  }

  private mapJob(job: any, entry: ProviderEntry, baseUrl: string): ProviderJob {
    const location = job.location || '';
    const description = job.description || '';
    const experience = this.extractExperience(description);

    return {
      title: job.title || job.jobTitle || 'Untitled Position',
      url: job.applyUrl || job.url || `${baseUrl}/jobs/${job.id}`,
      company: entry.name,
      location,
      description,
      posted_date: this.parsePostedDate(job.postedDate),
      salary_min: job.salaryMin,
      salary_max: job.salaryMax,
      salary_currency: job.currency || 'USD',
      experience_min: experience?.min,
      experience_max: experience?.max,
      remote_type: this.determineRemoteType(location),
      employment_type: job.employmentType,
      tags: this.extractSkills(description, this.getSkillKeywords()),
      metadata: {
        adp_id: job.id
      }
    };
  }

  private getSkillKeywords(): string[] {
    return ['Java', 'Python', 'C#', '.NET', 'JavaScript', 'React', 'AWS', 'SQL', 'Oracle'];
  }
}

export default new AdpProvider();