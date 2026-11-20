/**
 * Oracle Cloud / Taleo provider - Enterprise ATS
 */

import { BaseProvider } from './base.js';
import { ProviderEntry, ProviderJob, FetchContext } from '../core/models.js';

export class OracleCloudProvider extends BaseProvider {
  readonly id = 'oraclecloud';
  readonly name = 'Oracle Cloud / Taleo';

  async detect(entry: ProviderEntry): Promise<boolean> {
    if (entry.provider === 'oraclecloud') return true;
    if (!entry.careers_url) return false;

    try {
      const url = new URL(entry.careers_url);
      return url.hostname.includes('oraclecloud') ||
             url.hostname.includes('taleo');
    } catch {
      return false;
    }
  }

  async fetch(entry: ProviderEntry, ctx: FetchContext): Promise<ProviderJob[]> {
    const baseUrl = this.getBaseUrl(entry);
    if (!baseUrl) return [];

    const jobs: ProviderJob[] = [];

    try {
      // Oracle/Taleo often has RSS feeds
      const rssUrl = `${baseUrl}/rss.xml`;
      const response = await ctx.http.get(rssUrl, `oracle:rss:${entry.provider_id}`);

      if (response.status === 200) {
        const rssJobs = this.parseRss(response.data, entry, baseUrl);
        jobs.push(...rssJobs);
      }
    } catch (error) {
      console.warn(`⚠️  Oracle Cloud: Error fetching for ${entry.name}: ${(error as Error).message}`);
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

  private parseRss(xml: string, entry: ProviderEntry, baseUrl: string): ProviderJob[] {
    const jobs: ProviderJob[] = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
    let match;

    while ((match = itemRegex.exec(xml)) !== null && jobs.length < 100) {
      const item = match[1];
      const titleMatch = item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) || item.match(/<title>(.*?)<\/title>/);
      const linkMatch = item.match(/<link>(.*?)<\/link>/);
      const descMatch = item.match(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/) || item.match(/<description>([\s\S]*?)<\/description>/);
      const pubDateMatch = item.match(/<pubDate>(.*?)<\/pubDate>/);

      if (titleMatch && linkMatch) {
        const title = titleMatch[1].trim();
        const url = linkMatch[1].trim();
        const description = descMatch ? descMatch[1].replace(/<!\[CDATA\[|\]\]>/g, '') : '';
        const postedDate = pubDateMatch ? this.parsePostedDate(pubDateMatch[1]) : undefined;

        jobs.push({
          title,
          url,
          company: entry.name,
          location: '',
          description,
          posted_date: postedDate,
          remote_type: 'onsite',
          metadata: { rss_parsed: true }
        });
      }
    }

    return jobs;
  }
}

export default new OracleCloudProvider();