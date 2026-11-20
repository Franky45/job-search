/**
 * SuccessFactors (SAP) provider - Enterprise ATS
 */

import { BaseProvider } from './base.js';
import { ProviderEntry, ProviderJob, FetchContext } from '../core/models.js';

export class SuccessFactorsProvider extends BaseProvider {
  readonly id = 'successfactors';
  readonly name = 'SAP SuccessFactors';

  async detect(entry: ProviderEntry): Promise<boolean> {
    if (entry.provider === 'successfactors') return true;
    if (!entry.careers_url) return false;

    try {
      const url = new URL(entry.careers_url);
      return url.hostname.includes('successfactors') ||
             url.hostname.includes('sapsf');
    } catch {
      return false;
    }
  }

  async fetch(entry: ProviderEntry, ctx: FetchContext): Promise<ProviderJob[]> {
    const baseUrl = this.getBaseUrl(entry);
    if (!baseUrl) return [];

    const jobs: ProviderJob[] = [];

    try {
      const apiUrl = `${baseUrl}/search?q=`;
      const response = await ctx.http.get(apiUrl, `successfactors:${entry.provider_id}`);

      if (response.status !== 200) return [];

      // SuccessFactors often returns HTML, need to parse
      const htmlJobs = this.parseHtmlJobs(response.data, entry, baseUrl);
      jobs.push(...htmlJobs);
    } catch (error) {
      console.warn(`⚠️  SuccessFactors: Error fetching for ${entry.name}: ${(error as Error).message}`);
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
    return null;
  }

  private parseHtmlJobs(html: string, entry: ProviderEntry, baseUrl: string): ProviderJob[] {
    const jobs: ProviderJob[] = [];
    // Basic HTML parsing for job listings
    const jobCardRegex = /<div[^>]*class="[^"]*job[^"]*"[^>]*>([\s\S]*?)<\/div>/gi;
    let match;

    while ((match = jobCardRegex.exec(html)) !== null && jobs.length < 50) {
      const cardHtml = match[1];
      const titleMatch = cardHtml.match(/<a[^>]*>([^<]+)<\/a>/i);
      const linkMatch = cardHtml.match(/href=["']([^"']+)["']/i);
      const locationMatch = cardHtml.match(/location[^>]*>([^<]+)<\/[^>]+>/i);

      if (titleMatch && linkMatch) {
        const title = titleMatch[1].trim();
        const url = linkMatch[1].startsWith('http') ? linkMatch[1] : `${baseUrl}${linkMatch[1]}`;
        const location = locationMatch ? locationMatch[1].trim() : '';

        jobs.push({
          title,
          url,
          company: entry.name,
          location,
          description: '',
          posted_date: undefined,
          remote_type: this.determineRemoteType(location),
          metadata: { html_parsed: true }
        });
      }
    }

    return jobs;
  }
}

export default new SuccessFactorsProvider();