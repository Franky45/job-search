/**
 * HTML dashboard renderer using Eta template engine
 */

import * as eta from 'eta';
import { Job, ScanRun } from '../core/models.js';
import { getExperienceLabel, getAgeLabel } from '../filters/experience.js';
import { escapeHtml } from '../utils/escape.js';

interface DashboardData {
  jobs: Job[];
  scanRuns: ScanRun[];
  generatedAt: string;
  totalJobs: number;
  filters?: any;
}

// Configure Eta
eta.configure({
  views: '',
  cache: false,
  autoEscape: false
});

// Template as string (embedded for portability)
const DASHBOARD_TEMPLATE = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Job Openings — <%= it.generatedAt.split('T')[0] %></title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      background: #f8fafc;
      color: #1a202c;
      line-height: 1.5;
      padding: 1.5rem;
    }
    .container {
      max-width: 1400px;
      margin: 0 auto;
      background: #ffffff;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      overflow: hidden;
      border: 1px solid #e2e8f0;
    }
    header {
      background: #f1f5f9;
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid #e2e8f0;
    }
    header h1 { font-size: 1.5rem; color: #2d3748; margin-bottom: 0.25rem; }
    header p { color: #718096; font-size: 0.875rem; }
    .stats {
      display: flex;
      gap: 1.5rem;
      padding: 0.75rem 1.5rem;
      background: #fff;
      border-bottom: 1px solid #edf2f7;
    }
    .stat { font-size: 0.85rem; color: #4a5568; }
    .stat strong { color: #4c51bf; }
    .scan-info {
      padding: 0.75rem 1.5rem;
      background: #fafafa;
      border-bottom: 1px solid #edf2f7;
      font-size: 0.8rem;
      color: #718096;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.875rem;
    }
    th {
      text-align: left;
      padding: 0.75rem 1rem;
      font-weight: 600;
      color: #4a5568;
      background: #f8fafc;
      border-bottom: 2px solid #e2e8f0;
      text-transform: uppercase;
      letter-spacing: 0.025em;
      font-size: 0.75rem;
    }
    td {
      padding: 0.75rem 1rem;
      border-bottom: 1px solid #edf2f7;
      vertical-align: top;
    }
    tbody tr:hover { background: #f7fafc; }
    tbody tr:nth-child(even) { background: #fafafa; }
    .company { font-weight: 600; color: #2d3748; }
    .role { color: #4a5568; max-width: 300px; }
    .experience, .posted, .applicants { color: #718096; white-space: nowrap; }
    .skills { color: #4a5568; max-width: 250px; }
    .location { color: #718096; max-width: 200px; }
    .provider { color: #718096; white-space: nowrap; font-size: 0.8rem; }
    .status {
      display: inline-block;
      padding: 0.125rem 0.5rem;
      border-radius: 9999px;
      font-size: 0.7rem;
      font-weight: 600;
      text-transform: uppercase;
    }
    .status-new { background: #ebf8ff; color: #3182ce; }
    .status-evaluated { background: #fefcbf; color: #b7791f; }
    .status-applied { background: #e6fffa; color: #319795; }
    .status-interview { background: #faf089; color: #b7791f; }
    .status-offer { background: #c6f6d5; color: #276749; }
    .status-rejected { background: #fed7d7; color: #c53030; }
    .status-discarded { background: #e2e8f0; color: #718096; }
    .url { max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .url a { color: #4c51bf; text-decoration: none; }
    .url a:hover { text-decoration: underline; }
    .empty { color: #a0aec0; }
    .scan-history {
      margin-top: 2rem;
      padding: 1.5rem;
    }
    .scan-history h2 {
      font-size: 1.1rem;
      color: #2d3748;
      margin-bottom: 1rem;
      padding-bottom: 0.5rem;
      border-bottom: 1px solid #e2e8f0;
    }
    .scan-history table { font-size: 0.8rem; }
    .scan-history th, .scan-history td { padding: 0.5rem 0.75rem; }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>Job Pipeline</h1>
      <p>Last updated: <%= it.generatedAt.split('T')[0] %> · Generated: <%= new Date(it.generatedAt).toLocaleString() %></p>
    </header>
    <div class="stats">
      <div class="stat"><strong>Total:</strong> <%= it.totalJobs %></div>
      <div class="stat"><strong>New:</strong> <%= it.jobs.filter(j => j.status === 'new').length %></div>
      <div class="stat"><strong>Applied:</strong> <%= it.jobs.filter(j => j.status === 'applied').length %></div>
      <div class="stat"><strong>Interview:</strong> <%= it.jobs.filter(j => j.status === 'interview').length %></div>
      <div class="stat"><strong>Offer:</strong> <%= it.jobs.filter(j => j.status === 'offer').length %></div>
    </div>
    <div class="scan-info">
      <strong>Recent Scans:</strong>
      <% if (it.scanRuns.length > 0) { %>
        <% for (const run of it.scanRuns.slice(0, 5)) { %>
          <span style="margin-right: 1rem;">
            <%= new Date(run.run_date).toLocaleDateString() %>:
            <%= run.companies_scanned %> companies, <%= run.jobs_found %> found, <%= run.jobs_new %> new
          </span>
        <% } %>
      <% } else { %>
        No scan history yet. Run <code>career-ops scan</code> to discover jobs.
      <% } %>
    </div>
    <table>
      <thead>
        <tr>
          <th>Company</th>
          <th>Position</th>
          <th>Location</th>
          <th>Exp</th>
          <th>Skills</th>
          <th>Posted</th>
          <th>Provider</th>
          <th>Status</th>
          <th>Source</th>
        </tr>
      </thead>
      <tbody>
        <% for (const job of it.jobs) { %>
        <tr>
          <td class="company"><%= job.company %></td>
          <td class="role"><%= job.title %></td>
          <td class="location"><%= job.location || '<span class="empty">—</span>' %></td>
          <td class="experience"><%= job.experience_min || job.experience_max ? (job.experience_min && job.experience_max && job.experience_min !== job.experience_max ? job.experience_min + '-' + job.experience_max + ' yrs' : (job.experience_min || job.experience_max) + '+ yrs') : '<span class="empty">—</span>' %></td>
          <td class="skills"><%= job.tags && job.tags.length > 0 ? job.tags.slice(0, 8).join(', ') : '<span class="empty">—</span>' %></td>
          <td class="posted"><%= job.posted_date ? (new Date(job.posted_date).toLocaleDateString()) : '<span class="empty">—</span>' %></td>
          <td class="provider"><%= job.provider %></td>
          <td><span class="status status-<%= job.status %>"><%= job.status %></span></td>
          <td class="url"><a href="<%= job.source_url || job.canonical_url %>" target="_blank" rel="noopener"><%= job.source_url && job.source_url.startsWith('career-ops://') ? 'manual' : 'link' %></a></td>
        </tr>
        <% } %>
      </tbody>
    </table>
  </div>
</body>
</html>
`;

export function renderDashboard(jobs: Job[], scanRuns: ScanRun[], meta: { generatedAt: string; totalJobs: number; filters?: any }): string {
  const templateFn = eta.compile(DASHBOARD_TEMPLATE);
  return templateFn({
    jobs,
    scanRuns,
    generatedAt: meta.generatedAt,
    totalJobs: meta.totalJobs,
    filters: meta.filters
  });
}