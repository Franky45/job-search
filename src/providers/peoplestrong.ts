/**
 * PeopleStrong provider - Major Indian HRMS/ATS
 * Used by: Large Indian enterprises
 */

import { BaseProvider } from './base.js';
import { ProviderEntry, ProviderJob, FetchContext } from '../core/models.js';

export class PeopleStrongProvider extends BaseProvider {
  readonly id = 'peoplestrong';
  readonly name = 'PeopleStrong';

  async detect(entry: ProviderEntry): Promise<boolean> {
    if (entry.provider === 'peoplestrong') return true;
    if (!entry.careers_url) return false;

    try {
      const url = new URL(entry.careers_url);
      return url.hostname.includes('peoplestrong') ||
             url.hostname.includes('alt.work') ||
             url.pathname.includes('peoplestrong');
    } catch {
      return false;
    }
  }

  async fetch(entry: ProviderEntry, ctx: FetchContext): Promise<ProviderJob[]> {
    const baseUrl = this.getBaseUrl(entry);
    if (!baseUrl) return [];

    const jobs: ProviderJob[] = [];

    try {
      // PeopleStrong typically uses alt.work subdomain for careers
      const apiUrl = `${baseUrl}/api/v1/jobs`;
      const response = await ctx.http.get(apiUrl, `peoplestrong:${entry.provider_id}`);

      if (response.status === 200) {
        const data = JSON.parse(response.data);
        const jobList = data.jobs || data.data || data || [];

        for (const job of jobList) {
          jobs.push(this.mapJob(job, entry, baseUrl));
        }
      } else {
        // Try HTML fallback
        return this.fetchFromHtml(entry, ctx);
      }
    } catch (error) {
      console.warn(`⚠️  PeopleStrong: Error fetching for ${entry.name}: ${(error as Error).message}`);
    }

    return jobs;
  }

  private async fetchFromHtml(entry: ProviderEntry, ctx: FetchContext): Promise<ProviderJob[]> {
    if (!entry.careers_url) return [];
    const jobs: ProviderJob[] = [];

    try {
      const response = await ctx.http.get(entry.careers_url, `peoplestrong:html:${entry.name}`);
      if (response.status === 200) {
        // Extract JSON-LD
        const jsonLdJobs = this.extractJsonLd(response.data);
        for (const job of jsonLdJobs) {
          jobs.push(this.mapJsonLdJob(job, entry, baseUrl));
        }
      }
    } catch {}

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
      return `https://${entry.provider_id}.alt.work`;
    }

    const slug = entry.name.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '');
    return `https://${slug}.alt.work`;
  }

  private extractJsonLd(html: string): any[] {
    const jobs: any[] = [];
    const scriptRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
    let match;

    while ((match = scriptRegex.exec(html)) !== null) {
      try {
        const data = JSON.parse(match[1].trim());
        const items = Array.isArray(data) ? data : [data];
        for (const item of items) {
          if (item['@type'] === 'JobPosting') {
            jobs.push(item);
          }
        }
      } catch {}
    }

    return jobs;
  }

  private mapJob(job: any, entry: ProviderEntry, baseUrl: string): ProviderJob {
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
        peoplestrong_id: job.id
      }
    };
  }

  private mapJsonLdJob(job: any, entry: ProviderEntry, baseUrl: string): ProviderJob {
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
      remote_type: this.determineRemoteType(location || ''),
      employment_type: job.employmentType,
      tags: this.extractSkills(description, this.getSkillKeywords()),
      metadata: { json_ld: true }
    };
  }

  private getSkillKeywords(): string[] {
    return [
      'Java', 'Python', 'JavaScript', 'TypeScript', 'React', 'Angular', 'Node.js',
      'Spring', 'Spring Boot', 'Django', 'Flask', 'AWS', 'Azure', 'GCP',
      'Docker', 'Kubernetes', 'SQL', 'PostgreSQL', 'MongoDB', 'Redis'
    ];
  }
}

export default new PeopleStrongProvider();