/**
 * Base provider class and interfaces
 */

import { ProviderEntry, ProviderJob, FetchContext } from '../core/models.js';

export abstract class BaseProvider {
  abstract readonly id: string;
  abstract readonly name: string;

  /**
   * Detect if this provider can handle the given entry
   * Return true if this provider should be used
   */
  abstract detect(entry: ProviderEntry): boolean | Promise<boolean>;

  /**
   * Fetch jobs from the provider
   */
  abstract fetch(entry: ProviderEntry, ctx: FetchContext): Promise<ProviderJob[]>;

  /**
   * Normalize a job URL to canonical form for deduplication
   */
  normalizeUrl(url: string): string {
    try {
      const u = new URL(url);
      // Remove tracking parameters
      const trackingParams = [
        'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term',
        'ref', 'source', 'cid', 'gclid', 'fbclid', 'mc_cid', 'mc_eid',
        '_ga', '_gl', 'pk_campaign', 'pk_kwd'
      ];
      trackingParams.forEach(param => u.searchParams.delete(param));

      // Normalize hostname
      u.hostname = u.hostname.toLowerCase().replace(/^www\./, '');

      // Remove trailing slash
      u.pathname = u.pathname.replace(/\/+$/, '') || '/';

      // Remove fragment unless it's a known job ID pattern
      if (u.hash && !this.isJobIdFragment(u.hash)) {
        u.hash = '';
      }

      return u.toString();
    } catch {
      return url;
    }
  }

  /**
   * Check if fragment contains a job ID (e.g., #job-123, #/job/123)
   */
  protected isJobIdFragment(hash: string): boolean {
    return /^#(?:job|position)\/[\w-]+$/i.test(hash) ||
           /^#[\w-]+-\d+$/i.test(hash);
  }

  /**
   * Extract company slug from URL or entry
   */
  extractCompanySlug(entry: ProviderEntry): string {
    if (entry.provider_id) return entry.provider_id;
    if (entry.careers_url) {
      try {
        const u = new URL(entry.careers_url);
        const parts = u.pathname.split('/').filter(Boolean);
        return parts[parts.length - 1] || entry.name.toLowerCase().replace(/\s+/g, '-');
      } catch {
        return entry.name.toLowerCase().replace(/\s+/g, '-');
      }
    }
    return entry.name.toLowerCase().replace(/\s+/g, '-');
  }

  /**
   * Parse posted date from various formats
   */
  parsePostedDate(dateStr: string | undefined): string | undefined {
    if (!dateStr) return undefined;

    // Try ISO format first
    const isoDate = new Date(dateStr);
    if (!isNaN(isoDate.getTime())) {
      return isoDate.toISOString().split('T')[0];
    }

    // Try common formats
    const formats = [
      /(\d{4})-(\d{2})-(\d{2})/,
      /(\d{2})\/(\d{2})\/(\d{4})/,
      /(\d{2})-(\d{2})-(\d{4})/,
      /(\w+)\s+(\d{1,2}),?\s+(\d{4})/i
    ];

    for (const format of formats) {
      const match = dateStr.match(format);
      if (match) {
        try {
          const parsed = new Date(dateStr);
          if (!isNaN(parsed.getTime())) {
            return parsed.toISOString().split('T')[0];
          }
        } catch {}
      }
    }

    return undefined;
  }

  /**
   * Extract experience requirements from text
   */
  extractExperience(text: string): { min?: number; max?: number } | null {
    const patterns = [
      /(\d+)\s*[-–]\s*(\d+)\s*(?:years?|yrs?)/i,
      /(\d+)\s*\+\s*(?:years?|yrs?)/i,
      /minimum\s+(\d+)\s*(?:years?|yrs?)/i,
      /at least\s+(\d+)\s*(?:years?|yrs?)/i,
      /(\d+)\s*(?:years?|yrs?)\s*(?:of\s+)?experience/i
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        if (match[2]) {
          return { min: parseInt(match[1], 10), max: parseInt(match[2], 10) };
        }
        return { min: parseInt(match[1], 10) };
      }
    }

    return null;
  }

  /**
   * Extract skills/keywords from job description
   */
  extractSkills(text: string, skillKeywords: string[]): string[] {
    const found: string[] = [];
    const lowerText = text.toLowerCase();

    for (const skill of skillKeywords) {
      const regex = new RegExp(`\\b${skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      if (regex.test(lowerText)) {
        found.push(skill);
      }
    }

    return found;
  }

  /**
   * Determine remote type from location text
   */
  determineRemoteType(location: string): 'remote' | 'hybrid' | 'onsite' | undefined {
    const lower = location.toLowerCase();
    if (lower.includes('remote') && !lower.includes('hybrid')) return 'remote';
    if (lower.includes('hybrid')) return 'hybrid';
    if (lower.includes('onsite') || lower.includes('on-site') || lower.includes('office')) return 'onsite';
    return undefined;
  }
}

export interface ProviderModule {
  default: BaseProvider;
}