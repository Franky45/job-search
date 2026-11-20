#!/usr/bin/env node
/**
 * Career-Ops v2 - Unified local-first job search platform for India
 * Single-file CLI: scan, dashboard, pipeline, companies, config
 */

import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as yaml from 'js-yaml';
import { createHash } from 'node:crypto';
import { homedir } from 'node:os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ─── Configuration ───
const DEFAULT_DATA_DIR = join(homedir(), '.local', 'share', 'career-ops');
const DEFAULT_OUTPUT_DIR = join(DEFAULT_DATA_DIR, 'output');
const DEFAULT_CONFIG_PATH = join(homedir(), '.config', 'career-ops', 'user.yml');

function getDataDir() {
  return process.env.CAREER_OPS_DATA_DIR || DEFAULT_DATA_DIR;
}

function getOutputDir() {
  return process.env.CAREER_OPS_OUTPUT_DIR || DEFAULT_OUTPUT_DIR;
}

function getConfigPath() {
  return process.env.CAREER_OPS_CONFIG || DEFAULT_CONFIG_PATH;
}

function loadConfig() {
  const configPath = getConfigPath();
  if (existsSync(configPath)) {
    try {
      const content = readFileSync(configPath, 'utf-8');
      return yaml.load(content);
    } catch (e) {
      console.warn('Failed to load config:', e.message);
    }
  }
  return getDefaultConfig();
}

function getDefaultConfig() {
  return {
    data_dir: getDataDir(),
    output_dir: getOutputDir(),
    scan: {
      concurrency: 8,
      max_age_days: 14,
      experience_stretch_years: 2,
      experience_max_years: 15,
      title_filter: {
        positive: ['Senior', 'Lead', 'Principal', 'Staff', 'Engineer', 'Developer', 'Architect', 'Manager'],
        negative: ['Intern', 'Junior', 'Entry', 'Trainee', 'Graduate', 'Fresher']
      },
      location_filter: {
        allow: ['Bangalore', 'Bengaluru', 'Hyderabad', 'Pune', 'Chennai', 'Mumbai', 'Delhi', 'Gurgaon', 'Noida', 'Remote'],
        block: []
      },
      experience_filter: {
        min: 0,
        max: 15
      }
    },
    resume: {
      path: '',
      primary_skills: [],
      require_primary_match: true,
      min_match_score: 25
    },
    companies: [
      { name: 'Tata Consultancy Services', provider: 'darwinbox', provider_id: 'tcs' },
      { name: 'Infosys', provider: 'darwinbox', provider_id: 'infosys' },
      { name: 'Wipro', provider: 'peoplestrong', provider_id: 'wipro' },
      { name: 'HCL Technologies', provider: 'workday', provider_id: 'hcl' },
      { name: 'Tech Mahindra', provider: 'darwinbox', provider_id: 'techm' }
    ]
  };
}

// ─── Database (simple JSON file) ───
const DB_PATH = join(getDataDir(), 'jobs.json');

function loadDB() {
  if (existsSync(DB_PATH)) {
    try {
      return JSON.parse(readFileSync(DB_PATH, 'utf-8'));
    } catch {}
  }
  return { jobs: [], scan_runs: [], pipeline: [], profile: {} };
}

function saveDB(db) {
  mkdirSync(getDataDir(), { recursive: true });
  writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

function generateCanonicalUrl(url, title, company) {
  if (!url) {
    const hash = createHash('sha256').update(`${company.toLowerCase()}|${title.toLowerCase()}`).digest('hex').slice(0, 16);
    return `career-ops://manual/${hash}`;
  }
  try {
    const u = new URL(url);
    const trackingParams = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'ref', 'source', 'cid', 'gclid', 'fbclid', 'mc_cid', 'mc_eid', '_ga', '_gl'];
    trackingParams.forEach(p => u.searchParams.delete(p));
    u.hostname = u.hostname.toLowerCase().replace(/^www\./, '');
    u.pathname = u.pathname.replace(/\/+$/, '') || '/';
    if (u.hash && !/^#[\w-]+-\d+$/i.test(u.hash)) u.hash = '';
    return u.toString();
  } catch {
    const hash = createHash('sha256').update(`${company.toLowerCase()}|${title.toLowerCase()}|${url}`).digest('hex').slice(0, 16);
    return `career-ops://invalid/${hash}`;
  }
}

// ─── Title Filter ───
function buildTitleFilter(positive, negative) {
  const posMatchers = (positive || []).map(k => {
    const t = k.trim().toLowerCase();
    if (t.startsWith('word:')) return { raw: k, match: s => new RegExp(`(?<!\\w)${t.slice(5)}(?!\\w)`, 'u').test(s.toLowerCase()) };
    if (t.startsWith('stem:')) return { raw: k, match: s => new RegExp(`(?<!\\w)${t.slice(5)}\\w*`, 'u').test(s.toLowerCase()) };
    const re = new RegExp(`(?<!\\w)${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?!\\w)`, 'u');
    return { raw: k, match: s => re.test(s.toLowerCase()) };
  });
  const negMatchers = (negative || []).map(k => {
    const t = k.trim().toLowerCase();
    const re = new RegExp(`(?<!\\w)${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?!\\w)`, 'u');
    return { raw: k, match: s => re.test(s.toLowerCase()) };
  });
  return (title) => {
    if (!title) return false;
    const lower = title.toLowerCase();
    if (posMatchers.length === 0) return !negMatchers.some(m => m.match(lower));
    if (!posMatchers.some(m => m.match(lower))) return false;
    if (negMatchers.some(m => m.match(lower))) return false;
    return true;
  };
}

// ─── Location Filter ───
function buildLocationFilter(allow, block, alwaysAllow) {
  const allowMatchers = (allow || []).map(k => {
    const t = k.trim().toLowerCase();
    const re = new RegExp(`(?<!\\w)${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?!\\w)`, 'u');
    return s => re.test(s.toLowerCase());
  });
  const blockMatchers = (block || []).map(k => {
    const t = k.trim().toLowerCase();
    const re = new RegExp(`(?<!\\w)${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?!\\w)`, 'u');
    return s => re.test(s.toLowerCase());
  });
  const alwaysMatchers = (alwaysAllow || []).map(k => {
    const t = k.trim().toLowerCase();
    const re = new RegExp(`(?<!\\w)${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?!\\w)`, 'u');
    return s => re.test(s.toLowerCase());
  });
  return (location, hint) => {
    const text = (location || '') + ' ' + (hint || '');
    const lower = text.toLowerCase();
    if (!text.trim()) return allow.length === 0 && block.length === 0;
    if (alwaysMatchers.some(m => m(lower))) return true;
    if (blockMatchers.some(m => m(lower))) return false;
    if (allow.length === 0) return true;
    return allowMatchers.some(m => m(lower));
  };
}

// ─── Experience Filter ───
function extractExperience(text) {
  if (!text) return null;
  const patterns = [
    /(\d+)\s*[\-–]\s*(\d+)\s*(?:years?|yrs?)/gi,
    /(\d+)\s*\+\s*(?:years?|yrs?)/gi,
    /minimum\s+(\d+)\s*(?:years?|yrs?)/gi,
    /(\d+)\s*(?:years?|yrs?)\s*(?:of\s+)?experience/gi
  ];
  for (const p of patterns) {
    const m = p.exec(text);
    if (m) return m[2] ? { min: +m[1], max: +m[2] } : { min: +m[1] };
  }
  return null;
}

function buildExperienceFilter(maxYears, stretchYears) {
  const limit = maxYears + stretchYears;
  return (exp) => !exp || (exp.min || 0) <= limit;
}

// ─── Age Filter ───
function buildAgeFilter(maxAgeDays) {
  const cutoff = Date.now() - maxAgeDays * 86400000;
  return (dateStr) => {
    if (!dateStr) return true;
    const d = new Date(dateStr);
    return isNaN(d.getTime()) || d >= cutoff;
  };
}

// ─── Skill Matching & Resume Parser ───
const TECH_SKILLS = [
  // Languages
  'java', 'python', 'javascript', 'typescript', 'c#', 'c++', 'c', 'go', 'rust', 'kotlin', 'swift', 'php', 'ruby', 'scala', 'r', 'matlab',
  // Web/Frontend
  'react', 'angular', 'vue', 'svelte', 'next.js', 'nuxt', 'html', 'css', 'sass', 'tailwind', 'bootstrap', 'jquery',
  // Backend/Frameworks
  'spring', 'spring boot', 'django', 'flask', 'fastapi', 'express', 'nestjs', 'koa', '.net', 'asp.net', 'node.js', 'nodejs',
  // Databases
  'sql', 'postgresql', 'postgres', 'mysql', 'mongodb', 'redis', 'cassandra', 'dynamodb', 'elasticsearch', 'sqlite', 'oracle', 'mariadb',
  // Cloud/DevOps
  'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'k8s', 'terraform', 'ansible', 'jenkins', 'gitlab', 'github actions', 'circleci', 'argocd',
  // Tools/IDEs
  'git', 'github', 'gitlab', 'bitbucket', 'jira', 'confluence', 'vs code', 'vscode', 'intellij', 'eclipse', 'pycharm', 'webstorm',
  // Testing
  'junit', 'pytest', 'jest', 'cypress', 'playwright', 'selenium', 'testng', 'mockito', 'postman', 'rest assured',
  // Data/ML
  'pandas', 'numpy', 'scikit-learn', 'tensorflow', 'pytorch', 'keras', 'spark', 'hadoop', 'kafka', 'airflow', 'tableau', 'power bi',
  // Mobile
  'android', 'ios', 'flutter', 'react native', 'xamarin', 'swiftui',
  // Architecture
  'microservices', 'rest', 'graphql', 'grpc', 'api', 'design patterns', 'clean architecture', 'ddd', 'event driven'
];

const PRIMARY_SKILLS = ['java', 'python', 'javascript', 'typescript', 'c#', 'c++', 'c', 'go', 'rust', 'kotlin', 'swift', 'php', 'ruby', 'scala', 'r'];

function extractSkillsFromText(text) {
  if (!text) return { primary: [], secondary: [], all: [] };
  const lower = text.toLowerCase();
  const found = TECH_SKILLS.filter(skill => {
    const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`(?<!\\w)${escaped}(?!\\w)`, 'u').test(lower);
  });
  const primary = found.filter(s => PRIMARY_SKILLS.includes(s));
  const secondary = found.filter(s => !PRIMARY_SKILLS.includes(s));
  return { primary, secondary, all: found };
}

function parseResume(resumePath) {
  try {
    if (!existsSync(resumePath)) return null;
    const ext = resumePath.split('.').pop().toLowerCase();
    let text = '';
    if (ext === 'txt' || ext === 'md') {
      text = readFileSync(resumePath, 'utf-8');
    } else if (ext === 'pdf') {
      // Simple PDF text extraction fallback
      console.warn('PDF parsing not implemented - use txt/md resume');
      return null;
    }
    return text;
  } catch {
    return null;
  }
}

function computeSkillMatch(jobDesc, userSkills) {
  if (!jobDesc || userSkills.all.length === 0) return { score: 0, matched: [], missing: [] };
  const lower = jobDesc.toLowerCase();
  const matched = userSkills.all.filter(skill => {
    const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`(?<!\\w)${escaped}(?!\\w)`, 'u').test(lower);
  });
  const primaryMatched = userSkills.primary.filter(p => matched.includes(p));
  const score = userSkills.all.length > 0 ? Math.round((matched.length / userSkills.all.length) * 100) : 0;
  return { score, matched, primaryMatched, missing: userSkills.all.filter(s => !matched.includes(s)) };
}

function hasPrimarySkillMatch(jobDesc, userPrimarySkills) {
  if (!userPrimarySkills || userPrimarySkills.length === 0) return true; // No primary skills required
  if (!jobDesc) return false;
  const lower = jobDesc.toLowerCase();
  return userPrimarySkills.some(skill => {
    const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`(?<!\\w)${escaped}(?!\\w)`, 'u').test(lower);
  });
}

// ─── Provider Fetching ───
async function fetchProvider(provider, company, httpClient) {
  const baseUrl = company.careers_url || `https://${company.provider_id}.${provider}.com`;
  const jobs = [];

  try {
    let url, response;
    switch (provider) {
      case 'darwinbox':
        url = `${baseUrl}/api/v1/jobs?page=1&limit=100&status=published`;
        response = await httpClient.get(url);
        if (response.ok) {
          const data = JSON.parse(response.body);
          for (const job of data.data || data.jobs || []) {
            jobs.push({
              title: job.title || job.name,
              url: job.apply_url || job.url || `${baseUrl}/careers/${job.slug || job.id}`,
              company: company.name,
              location: job.location?.city || job.location,
              description: job.description || '',
              posted_date: job.posted_at || job.created_at,
              salary_min: job.salary_min,
              salary_max: job.salary_max,
              salary_currency: job.salary_currency || 'INR',
              remote_type: job.remote_type
            });
          }
        }
        break;
      case 'greenhouse':
        if (company.provider_id) {
          url = `https://boards-api.greenhouse.io/v1/boards/${company.provider_id}/jobs?content=true`;
          response = await httpClient.get(url);
          if (response.ok) {
            const data = JSON.parse(response.body);
            for (const job of data.jobs || []) {
              jobs.push({
                title: job.title,
                url: job.absolute_url,
                company: company.name,
                location: job.location?.name,
                description: job.content || '',
                posted_date: job.updated_at,
                remote_type: job.workplace_type
              });
            }
          }
        }
        break;
      case 'lever':
        if (company.provider_id) {
          url = `https://api.lever.co/v0/postings/${company.provider_id}?mode=json`;
          response = await httpClient.get(url);
          if (response.ok) {
            const data = JSON.parse(response.body);
            for (const job of data) {
              jobs.push({
                title: job.text,
                url: job.applyUrl || job.hostedUrl || `https://jobs.lever.co/${company.provider_id}/${job.id}`,
                company: company.name,
                location: job.categories?.location,
                description: job.descriptionPlain || '',
                posted_date: job.createdAt ? new Date(job.createdAt).toISOString() : undefined
              });
            }
          }
        }
        break;
    case 'keka':
      try {
        url = `${baseUrl}/api/careers/jobs`;
        response = await httpClient.get(url);
        if (response.ok) {
          const data = JSON.parse(response.body);
          for (const job of data.jobs || data.data || data || []) {
            jobs.push({
              title: job.title || job.jobTitle || job.name,
              url: job.applyUrl || job.url || `${baseUrl}/careers/${job.slug || job.id}`,
              company: company.name,
              location: job.location || job.jobLocation || job.city,
              description: job.description || job.jobDescription || '',
              posted_date: job.postedDate || job.createdAt || job.updatedAt,
              salary_min: job.salaryMin || job.minSalary,
              salary_max: job.salaryMax || job.maxSalary,
              salary_currency: job.salaryCurrency || 'INR',
              remote_type: job.remoteType
            });
          }
        }
      } catch (e) {
        console.warn(`  keka: ${e.message}`);
      }
      break;
    case 'zoho-recruit':
      try {
        const digest = company.provider_id;
        if (digest) {
          url = `https://recruit.zoho.com/recruit/v2/public/Job_Openings?digest=${digest}`;
          response = await httpClient.get(url);
          if (response.ok) {
            const data = JSON.parse(response.body);
            for (const job of data.data || []) {
              jobs.push({
                title: job.Job_Opening_Name || job.Job_Title,
                url: `https://recruit.zoho.com/recruit/PortalDetail.na?iframe=true&digest=${digest}&jobid=${job.Job_Opening_ID || job.id}`,
                company: company.name,
                location: [job.City, job.State, job.Country].filter(Boolean).join(', '),
                description: job.Job_Description || '',
                posted_date: job.Date_Opened || job.Created_Time,
                salary_min: job.Salary_Minimum || job.Salary,
                salary_max: job.Salary_Maximum,
                salary_currency: job.Currency || 'INR'
              });
            }
          }
        }
      } catch (e) {
        console.warn(`  zoho-recruit: ${e.message}`);
      }
      break;
    case 'freshteam':
      try {
        url = `${baseUrl}/jobs.json`;
        response = await httpClient.get(url);
        if (response.ok) {
          const data = JSON.parse(response.body);
          for (const job of data.jobs || data || []) {
            jobs.push({
              title: job.title || job.name,
              url: job.url || job.apply_url || `${baseUrl}/jobs/${job.id}`,
              company: company.name,
              location: job.location || job.job_location,
              description: job.description || job.description_text || '',
              posted_date: job.published_at || job.created_at || job.updated_at,
              salary_min: job.salary_min,
              salary_max: job.salary_max,
              salary_currency: job.salary_currency || 'INR'
            });
          }
        }
      } catch (e) {
        console.warn(`  freshteam: ${e.message}`);
      }
      break;
    case 'peoplestrong':
      try {
        url = `${baseUrl}/api/v1/jobs`;
        response = await httpClient.get(url);
        if (response.ok) {
          const data = JSON.parse(response.body);
          for (const job of data.jobs || data.data || data || []) {
            jobs.push({
              title: job.title || job.name,
              url: job.url || job.apply_url || `${baseUrl}/jobs/${job.id}`,
              company: company.name,
              location: job.location || job.job_location,
              description: job.description || job.description_text || '',
              posted_date: job.published_at || job.created_at || job.updated_at,
              salary_min: job.salary_min,
              salary_max: job.salary_max,
              salary_currency: job.salary_currency || 'INR'
            });
          }
        }
      } catch (e) {
        console.warn(`  peoplestrong: ${e.message}`);
      }
      break;
    case 'sumhr':
      try {
        url = `${baseUrl}/api/careers/jobs`;
        response = await httpClient.get(url);
        if (response.ok) {
          const data = JSON.parse(response.body);
          for (const job of data.jobs || data.data || []) {
            jobs.push({
              title: job.title || job.name,
              url: job.applyUrl || job.url || `${baseUrl}/jobs/${job.id}`,
              company: company.name,
              location: job.location || '',
              description: job.description || '',
              posted_date: job.postedDate,
              salary_min: job.salaryMin,
              salary_max: job.salaryMax,
              salary_currency: job.currency || 'INR'
            });
          }
        }
      } catch (e) {
        console.warn(`  sumhr: ${e.message}`);
      }
      break;
    }
  } catch (e) {
    console.warn(`  ${provider}: ${e.message}`);
  }
  return jobs;
}

// ─── HTTP Client ───
const httpClient = {
  async get(url) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    try {
      const res = await fetch(url, { signal: controller.signal, headers: { 'User-Agent': 'Career-Ops/2.0' } });
      clearTimeout(timeout);
      return { ok: res.ok, status: res.status, body: await res.text() };
    } catch (e) {
      clearTimeout(timeout);
      return { ok: false, status: 0, body: '', error: e.message };
    }
  }
};

// ─── Main Commands ───
async function cmdScan(options) {
  const config = loadConfig();
  const scanConfig = config.scan;
  const companies = config.companies.filter(c => c.enabled !== false);
  const db = loadDB();

  // Load user's resume skills
  const resumeConfig = config.resume || {};
  const userSkills = resumeConfig.primary_skills || [];
  const requirePrimaryMatch = resumeConfig.require_primary_match !== false;
  const minMatchScore = resumeConfig.min_match_score || 25;

  const titleFilter = buildTitleFilter(scanConfig.title_filter.positive, scanConfig.title_filter.negative);
  const locationFilter = buildLocationFilter(scanConfig.location_filter.allow, scanConfig.location_filter.block, scanConfig.location_filter.always_allow);
  const expFilter = buildExperienceFilter(scanConfig.experience_max_years, scanConfig.experience_stretch_years);
  const ageFilter = buildAgeFilter(scanConfig.max_age_days);

  // Experience range filter
  const expMin = scanConfig.experience_filter?.min ?? 0;
  const expMax = scanConfig.experience_filter?.max ?? 15;

  console.log(`Scanning ${companies.length} companies...`);
  if (userSkills.length > 0) {
    console.log(`  Primary skills: ${userSkills.join(', ')}`);
    console.log(`  Require primary match: ${requirePrimaryMatch}`);
    console.log(`  Min match score: ${minMatchScore}%`);
  }
  console.log('');

  let found = 0, added = 0, filtered = 0, dupes = 0;

  for (const company of companies) {
    const provider = company.provider || 'unknown';
    console.log(`  ${provider}: ${company.name}...`);
    const jobs = await fetchProvider(provider, company, httpClient);

    for (const job of jobs) {
      found++;
      if (!titleFilter(job.title)) { filtered++; continue; }
      if (!locationFilter(job.location || '', job.url)) { filtered++; continue; }
      const exp = extractExperience(job.description || '');
      if (!expFilter(exp)) { filtered++; continue; }
      if (!ageFilter(job.posted_date)) { filtered++; continue; }

      // Experience range filter
      const jobMinExp = exp?.min ?? job.experience_min ?? 0;
      const jobMaxExp = exp?.max ?? job.experience_max ?? 15;
      if (jobMinExp > expMax || jobMaxExp < expMin) { filtered++; continue; }

      // Skill matching
      const match = computeSkillMatch(job.description || '', { primary: userSkills, secondary: [], all: userSkills });

      // Require primary skill match for freshers/configured users
      if (requirePrimaryMatch && userSkills.length > 0) {
        const hasPrimary = hasPrimarySkillMatch(job.description || '', userSkills);
        if (!hasPrimary) { filtered++; continue; }
      }

      // Minimum match score
      if (match.score < minMatchScore) { filtered++; continue; }

      const canonical = generateCanonicalUrl(job.url, job.title, company.name);
      if (db.jobs.some(j => j.canonical_url === canonical)) { dupes++; continue; }

      if (!options.dryRun) {
        db.jobs.push({
          canonical_url: canonical,
          source_url: job.url,
          provider,
          company: company.name,
          title: job.title,
          location: job.location,
          description: job.description,
          posted_date: job.posted_date,
          discovered_date: new Date().toISOString(),
          salary_min: job.salary_min,
          salary_max: job.salary_max,
          salary_currency: job.salary_currency,
          experience_min: job.experience_min ?? exp?.min,
          experience_max: job.experience_max ?? exp?.max,
          remote_type: job.remote_type,
          tags: match.matched.slice(0, 8), // Store matched skills
          status: 'new',
          match_score: match.score
        });
      }
      added++;
    }
  }

  if (!options.dryRun) {
    db.scan_runs.unshift({
      run_date: new Date().toISOString(),
      companies_scanned: companies.length,
      jobs_found: found,
      jobs_new: added,
      jobs_filtered: filtered,
      duration_ms: 0
    });
    saveDB(db);
  }

  console.log(`\nDone: ${found} found, ${added} new, ${filtered} filtered, ${dupes} duplicates`);
}

function cmdDashboard(options) {
  const config = loadConfig();
  const db = loadDB();

  let jobs = db.jobs;
  if (options.status) jobs = jobs.filter(j => j.status === options.status);
  if (options.company) jobs = jobs.filter(j => j.company.toLowerCase().includes(options.company.toLowerCase()));
  if (options.limit) jobs = jobs.slice(0, +options.limit);

  const html = renderDashboard(jobs, db.scan_runs.slice(0, 10));
  const outputPath = options.output || join(getOutputDir(), `jobs-${new Date().toISOString().split('T')[0]}.html`);
  mkdirSync(getOutputDir(), { recursive: true });
  writeFileSync(outputPath, html);
  console.log(`\nDashboard: ${outputPath}`);
  console.log(`Jobs: ${jobs.length}`);
}

function renderDashboard(jobs, scanRuns) {
  const today = new Date().toISOString().split('T')[0];
  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Job Openings - ${today}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f8fafc;color:#1a202c;padding:1.5rem}
.container{max-width:1400px;margin:0 auto;background:#fff;border-radius:8px;box-shadow:0 1px 3px rgba(0,0,0,0.1);border:1px solid #e2e8f0}
header{background:#f1f5f9;padding:1.25rem 1.5rem;border-bottom:1px solid #e2e8f0}
header h1{font-size:1.5rem;color:#2d3748;margin-bottom:.25rem}
header p{color:#718096;font-size:.875rem}
.stats{display:flex;gap:1.5rem;padding:.75rem 1.5rem;border-bottom:1px solid #edf2f7}
.stat{font-size:.85rem;color:#4a5568}
.stat strong{color:#4c51bf}
table{width:100%;border-collapse:collapse;font-size:.875rem}
th{text-align:left;padding:.75rem 1rem;font-weight:600;color:#4a5568;background:#f8fafc;border-bottom:2px solid #e2e8f0;text-transform:uppercase;font-size:.75rem}
td{padding:.75rem 1rem;border-bottom:1px solid #edf2f7;vertical-align:top}
tr:hover{background:#f7fafc}
tr:nth-child(even){background:#fafafa}
.company{font-weight:600;color:#2d3748}
.role{color:#4a5568;max-width:300px}
.exp,.posted{color:#718096;white-space:nowrap}
.skills{color:#4a5568;max-width:250px}
.match-score{font-weight:600;font-size:.8rem}
.score-high{color:#276749}
.score-med{color:#b7791f}
.score-low{color:#c53030}
.primary-skill{background:#ebf8ff;color:#3182ce;padding:.1rem .4rem;border-radius:.25rem;font-size:.7rem;margin:.1rem;display:inline-block}
.url a{color:#4c51bf;text-decoration:none}
.url a:hover{text-decoration:underline}
.empty{color:#a0aec0}
</style></head>
<body><div class="container">
<header><h1>Job Pipeline</h1><p>Updated: ${today}</p></header>
<div class="stats"><div class="stat"><strong>Total:</strong> ${jobs.length}</div><div class="stat"><strong>New:</strong> ${jobs.filter(j=>j.status==='new').length}</div></div>
<table><thead><tr><th>Company</th><th>Position</th><th>Exp</th><th>Matched Skills</th><th>Match</th><th>Posted</th><th>Source</th></tr></thead>
<tbody>${jobs.map(j=>{
  const score = j.match_score || 0;
  const scoreClass = score >= 75 ? 'score-high' : score >= 50 ? 'score-med' : 'score-low';
  const primarySkills = j.tags?.filter(t => ['java','python','javascript','typescript','c#','c++','c','go','rust','kotlin','swift','php','ruby','scala','r'].includes(t.toLowerCase())) || [];
  return `<tr>
<td class="company">${escapeHtml(j.company)}</td>
<td class="role">${escapeHtml(j.title)}</td>
<td class="exp">${j.experience_min||j.experience_max?((j.experience_min&&j.experience_max&&j.experience_min!==j.experience_max)?j.experience_min+'-'+j.experience_max+' yrs':(j.experience_min||j.experience_max)+'+ yrs'):'<span class="empty">—</span>'}</td>
<td class="skills">${j.tags?.length?j.tags.slice(0,8).map(t=>primarySkills.includes(t)?`<span class="primary-skill">${escapeHtml(t)}</span>`:escapeHtml(t)).join(' '):'<span class="empty">—</span>'}</td>
<td class="match"><span class="match-score ${scoreClass}">${score}%</span></td>
<td class="posted">${j.posted_date?new Date(j.posted_date).toLocaleDateString():'<span class="empty">—</span>'}</td>
<td class="url"><a href="${j.source_url||j.canonical_url}" target="_blank">${j.source_url?.startsWith('career-ops://')?'manual':'link'}</a></td>
</tr>`}).join('')}</tbody></table></div></body></html>`;
}

function escapeHtml(s) {
  const map = {'&':'&','<':'<','>':'>','"':'"',"'":'&#39;'};
  return String(s).replace(/[&<>"']/g, m => map[m]);
}

function cmdPipeline(action, args) {
  const db = loadDB();
  switch (action) {
    case 'list':
      if (db.pipeline.length === 0) { console.log('No pipeline entries'); return; }
      for (const e of db.pipeline) console.log(`${e.checked?'✓':'○'} ${e.company} — ${e.title} (${e.url})`);
      break;
    case 'add':
      db.pipeline.unshift({ url: args[0], company: args.company, title: args.title, location: args.location, notes: args.notes, checked: false, created_date: new Date().toISOString() });
      saveDB(db);
      console.log('Added to pipeline');
      break;
    case 'remove':
      db.pipeline.splice(+args.id, 1);
      saveDB(db);
      console.log('Removed');
      break;
  }
}

function cmdCompanies(action, args) {
  const config = loadConfig();
  const db = loadDB();
  switch (action) {
    case 'list':
      for (const c of config.companies) console.log(`${c.enabled?'●':'○'} ${c.name} [${c.provider}]`);
      break;
    case 'add':
      config.companies.push({ name: args.name, provider: args.provider, provider_id: args.providerId, careers_url: args.url, enabled: !args.disabled });
      saveConfig(config);
      console.log(`Added ${args.name}`);
      break;
    case 'remove':
      config.companies = config.companies.filter(c => c.name !== args.name);
      saveConfig(config);
      console.log(`Removed ${args.name}`);
      break;
  }
}

function saveConfig(config) {
  const configPath = getConfigPath();
  mkdirSync(dirname(configPath), { recursive: true });
  writeFileSync(configPath, yaml.dump(config));
}

function cmdConfig(action) {
  const config = loadConfig();
  if (action === 'show') console.log(yaml.dump(config));
  else if (action === 'init') saveConfig(getDefaultConfig());
}

function cmdResume(action, args) {
  const config = loadConfig();
  if (action === 'parse' && args[0]) {
    const resumePath = args[0];
    const text = parseResume(resumePath);
    if (!text) {
      console.error('Failed to parse resume. Use .txt or .md format.');
      return;
    }
    const skills = extractSkillsFromText(text);
    console.log(`Primary skills found: ${skills.primary.join(', ') || 'none'}`);
    console.log(`Secondary skills found: ${skills.secondary.join(', ') || 'none'}`);

    if (skills.primary.length > 0) {
      config.resume = config.resume || {};
      config.resume.primary_skills = skills.primary;
      config.resume.require_primary_match = true;
      config.resume.min_match_score = 25;
      saveConfig(config);
      console.log('\n✅ Updated config with primary skills:', skills.primary.join(', '));
    }
  } else if (action === 'skills' && args[0]) {
    const skills = args[0].split(',').map(s => s.trim().toLowerCase());
    config.resume = config.resume || {};
    config.resume.primary_skills = skills;
    config.resume.require_primary_match = true;
    config.resume.min_match_score = 25;
    saveConfig(config);
    console.log('✅ Primary skills set:', skills.join(', '));
  } else if (action === 'show') {
    console.log('Primary skills:', config.resume?.primary_skills?.join(', ') || 'none');
    console.log('Require primary match:', config.resume?.require_primary_match !== false);
    console.log('Min match score:', config.resume?.min_match_score || 25);
  } else {
    console.log('Usage: career-ops resume parse <file.txt|file.md>');
    console.log('       career-ops resume skills "Java, Spring, React"');
    console.log('       career-ops resume show');
  }
}

async function cmdSetup() {
  const dataDir = getDataDir();
  const outputDir = getOutputDir();
  const configPath = getConfigPath();

  console.log('Career-Ops Setup');
  console.log(`Data dir:    ${dataDir}`);
  console.log(`Output dir:  ${outputDir}`);
  console.log(`Config path: ${configPath}`);

  mkdirSync(dataDir, { recursive: true });
  mkdirSync(outputDir, { recursive: true });
  mkdirSync(dirname(configPath), { recursive: true });

  if (!existsSync(configPath)) {
    writeFileSync(configPath, yaml.dump(getDefaultConfig()));
    console.log(`Config created: ${configPath}`);
  } else {
    console.log(`Config exists:  ${configPath}`);
  }

  // Initialize empty DB
  const dbPath = join(dataDir, 'jobs.json');
  if (!existsSync(dbPath)) {
    writeFileSync(dbPath, JSON.stringify({ jobs: [], scan_runs: [], pipeline: [], profile: {} }));
    console.log('Database initialized');
  }

  console.log('\n✅ Setup complete');
  console.log('Next steps:');
  console.log('  1. Edit config:', configPath);
  console.log('  2. Run scan:   career-ops scan');
  console.log('  3. View dashboard: career-ops dashboard');
}

function parseArgs() {
  const args = process.argv.slice(2);
  const cmd = args[0];
  const opts = {};
  for (let i = 1; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const key = args[i].slice(2);
      opts[key] = args[i + 1] && !args[i + 1].startsWith('--') ? args[++i] : true;
    }
  }
  return { cmd, opts, args: args.slice(1).filter(a => !a.startsWith('--')) };
}

async function main() {
  const { cmd, opts, args } = parseArgs();

  try {
    switch (cmd) {
      case 'scan': await cmdScan(opts); break;
      case 'dashboard': cmdDashboard(opts); break;
      case 'pipeline': cmdPipeline(args[0], { ...opts, ...Object.fromEntries(args.slice(1).map((v,i)=>[i,v])) }); break;
      case 'companies': cmdCompanies(args[0], { ...opts, ...Object.fromEntries(args.slice(1).map((v,i)=>[i,v])) }); break;
      case 'config': cmdConfig(args[0]); break;
      case 'setup': await cmdSetup(); break;
      case 'resume': cmdResume(args[0], args.slice(1)); break;
      default:
        console.log(`Career-Ops v2 - Unified job search for India
Usage: career-ops <command> [options]

Commands:
  scan         Scan companies for jobs
  dashboard    Generate HTML dashboard
  pipeline     Manage manual entries (list|add|remove)
  companies    Manage companies (list|add|remove)
  config       Show/init config (show|init)
  setup        Initialize data directory
  resume       Parse resume & set skills (parse|skills|show)`);
    }
  } catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
}

main();