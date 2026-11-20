/**
 * Deduplication utilities - canonical URL and job fingerprinting
 */

import { createHash } from 'crypto';

/**
 * Generate canonical URL for deduplication
 * Normalizes URL by removing tracking params, standardizing host, etc.
 */
export function generateCanonicalUrl(
  url: string | undefined,
  title: string,
  company: string
): string {
  if (!url) {
    // Fallback: create deterministic hash from title + company
    const hash = createHash('sha256')
      .update(`${company.toLowerCase()}|${title.toLowerCase()}`)
      .digest('hex')
      .slice(0, 16);
    return `career-ops://manual/${hash}`;
  }

  try {
    const u = new URL(url);

    // Remove tracking parameters
    const trackingParams = [
      'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term',
      'ref', 'source', 'cid', 'gclid', 'fbclid', 'mc_cid', 'mc_eid',
      '_ga', '_gl', 'pk_campaign', 'pk_kwd', 'utm_id', 'utm_source_platform',
      'utm_creative_format', 'utm_marketing_tactic', 'trk', 'trkInfo'
    ];
    trackingParams.forEach(param => u.searchParams.delete(param));

    // Normalize hostname
    u.hostname = u.hostname.toLowerCase().replace(/^www\./, '');

    // Remove trailing slash from pathname
    u.pathname = u.pathname.replace(/\/+$/, '') || '/';

    // Handle known job ID fragments - promote to path
    if (u.hash) {
      const jobIdMatch = u.hash.match(/^#\/?(?:job|position|detail)\/([\w-]+)$/i);
      if (jobIdMatch) {
        u.pathname = u.pathname.replace(/\/+$/, '') + '/' + jobIdMatch[1];
        u.hash = '';
      }
    }

    // Remove fragment if not a job ID
    if (u.hash && !/^#[\w-]+-\d+$/i.test(u.hash)) {
      u.hash = '';
    }

    return u.toString();
  } catch {
    // Invalid URL - fallback to hash
    const hash = createHash('sha256')
      .update(`${company.toLowerCase()}|${title.toLowerCase()}|${url}`)
      .digest('hex')
      .slice(0, 16);
    return `career-ops://invalid/${hash}`;
  }
}

/**
 * Generate content fingerprint for cross-listing detection
 * Uses title + company + location + first 500 chars of description
 */
export function generateFingerprint(
  title: string,
  company: string,
  location: string,
  description: string
): string {
  const normalizedTitle = title.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
  const normalizedCompany = company.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
  const normalizedLocation = location.toLowerCase().replace(/[^a-z0-9\s,]/g, '').replace(/\s+/g, ' ').trim();
  const normalizedDesc = description.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 500);

  const content = `${normalizedTitle}|${normalizedCompany}|${normalizedLocation}|${normalizedDesc}`;
  return createHash('sha256').update(content).digest('hex').slice(0, 32);
}

/**
 * Check if two jobs are likely the same position
 * Uses canonical URL first, then fingerprint
 */
export function areJobsSame(
  url1: string, title1: string, company1: string, location1: string, desc1: string,
  url2: string, title2: string, company2: string, location2: string, desc2: string
): boolean {
  const canonical1 = generateCanonicalUrl(url1, title1, company1);
  const canonical2 = generateCanonicalUrl(url2, title2, company2);

  // Same canonical URL = same job
  if (canonical1 === canonical2) return true;

  // Different URL but same fingerprint = likely cross-posting
  const fp1 = generateFingerprint(title1, company1, location1, desc1);
  const fp2 = generateFingerprint(title2, company2, location2, desc2);

  return fp1 === fp2;
}

/**
 * Normalize company name for comparison
 */
export function normalizeCompanyName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b(inc|llc|ltd|pvt|pvt\.|private|limited|corp|corporation|technologies|technology|tech|solutions|solution|services|service|systems|system|group|consulting|consultancy|consultants|india|global|worldwide|international|intl)\b/g, '')
    .trim();
}

/**
 * Check if two company names refer to the same entity
 */
export function companiesMatch(name1: string, name2: string): boolean {
  const norm1 = normalizeCompanyName(name1);
  const norm2 = normalizeCompanyName(name2);

  if (norm1 === norm2) return true;

  // Check if one contains the other (e.g., "TCS" vs "Tata Consultancy Services")
  if (norm1.includes(norm2) || norm2.includes(norm1)) return true;

  return false;
}