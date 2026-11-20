#!/usr/bin/env node
/**
 * scan-concise.mjs — Single consolidated job listings output
 *
 * Reads pipeline.md + scans portals, outputs ONE clean table:
 * Company | Role | Experience Required | Skills | Posted Date | Applicants | URL
 *
 * Usage: node scan-concise.mjs [--output=output.md]
 */

import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';

// Get career-ops data root
function getCareerOpsRoot() {
  const markerPath = join(process.cwd(), '.career-ops-data');
  const envOverride = process.env.CAREER_OPS_DATA_DIR || process.env.CAREER_OPS_ROOT;

  if (envOverride) {
    return envOverride.startsWith('~')
      ? join(process.env.HOME || process.env.USERPROFILE || '', envOverride.slice(1))
      : envOverride;
  }

  try {
    const markerContent = readFileSync(markerPath, 'utf-8').trim();
    return markerContent.startsWith('~')
      ? join(process.env.HOME || process.env.USERPROFILE || '', markerContent.slice(1))
      : markerContent;
  } catch {
    return process.cwd();
  }
}

const DATA_ROOT = getCareerOpsRoot();
const PIPELINE_PATH = join(DATA_ROOT, 'data', 'pipeline.md');
const OUTPUT_DIR = join(DATA_ROOT, 'output');

function ensureDir(dir) {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

// Parse pipeline.md for manual entries (local:jds/ + LinkedIn URLs)
function parsePipeline() {
  if (!existsSync(PIPELINE_PATH)) return [];
  const content = readFileSync(PIPELINE_PATH, 'utf-8');
  const entries = [];

  const lines = content.split('\n');
  for (const line of lines) {
    // Match: - [ ] URL | Company | Role | Location | [extra fields...]
    // The first 4 pipes separate: URL, Company, Role, Location
    // Everything after the 4th pipe is notes/extra info
    const trimmed = line.trim();
    if (!trimmed.startsWith('- [') || !trimmed.includes('|')) continue;

    const afterDash = trimmed.slice(2).trim(); // Remove "- "
    const parts = afterDash.split('|').map(p => p.trim());

    if (parts.length < 4) continue;

    // Extract checked status and URL
    const checkedMatch = parts[0].match(/\[([ x])\]\s*(.+)/);
    if (!checkedMatch) continue;

    const checked = checkedMatch[1];
    const ref = checkedMatch[2].trim();
    const company = parts[1];
    const role = parts[2];
    const location = parts[3];

    // Combine remaining parts as note
    const note = parts.slice(4).join(' | ');

    entries.push({
      checked: checked === 'x',
      ref: ref,
      company: company,
      role: role,
      location: location,
      note: note,
      source: 'pipeline'
    });
  }
  return entries;
}

// Extract experience/skills from note or local JD file
function extractDetailsFromPipeline(entry) {
  let experience = '—';
  let skills = '—';
  let posted = '—';
  let applicants = '—';

  // From note field (e.g., "posted: 2026-11-17 | yrs: 8+ above band" or "note: posting ...")
  if (entry.note) {
    // Remove "note: " prefix if present
    const cleanNote = entry.note.replace(/^note:\s*/i, '');

    const yrsMatch = cleanNote.match(/yrs?:\s*([^|]+)/i);
    if (yrsMatch) experience = yrsMatch[1].trim();

    const postedMatch = cleanNote.match(/posted:\s*([^|]+)/i);
    if (postedMatch) posted = postedMatch[1].trim();

    const appMatch = cleanNote.match(/applicants?:\s*([^|]+)/i);
    if (appMatch) applicants = appMatch[1].trim();

    // Extract skills from the note (Rubrik URLs have posted/yrs info)
    const skillKeywords = ['Java', 'Spring', 'React', 'Angular', 'Python', 'AWS', 'Docker', 'Kubernetes', 'Microservices', 'REST', 'SQL', 'MySQL', 'PostgreSQL', 'MongoDB', 'Redis', 'Kafka', 'JWT', 'OAuth', 'Full Stack', 'Backend', 'Frontend', 'Angular', 'Node', 'TypeScript'];
    const foundSkills = skillKeywords.filter(s => new RegExp(`\\b${s}\\b`, 'i').test(cleanNote));
    if (foundSkills.length > 0) skills = foundSkills.slice(0, 8).join(', ');
  }

  // If local JD file, try to read it for more details (overrides note skills)
  if (entry.ref.startsWith('local:jds/')) {
    const jdRelPath = entry.ref.replace('local:', ''); // Remove 'local:' prefix
    const jdPath = join(DATA_ROOT, jdRelPath);
    if (existsSync(jdPath)) {
      const jdContent = readFileSync(jdPath, 'utf-8');
      // Extract years requirement - look for "X-Y years" or "X years" pattern
      const yrsMatch = jdContent.match(/(?:years?|experience)\D*(\d+\s*[\-–]\s*\d+|\d+\s*\+\s*\d*|\d+)\s*(?:years?|yrs?)/i);
      if (yrsMatch) experience = yrsMatch[1].trim();

      // Extract skills/keywords - check Key Skills section and full content
      const skillKeywords = ['Java', 'Spring', 'React', 'Angular', 'Python', 'AWS', 'Docker', 'Kubernetes', 'Microservices', 'REST', 'SQL', 'MySQL', 'PostgreSQL', 'MongoDB', 'Redis', 'Kafka', 'JWT', 'OAuth', 'Hibernate', 'JPA', 'Maven', 'Gradle', 'Oracle', 'PL/SQL', 'Tomcat', 'Nginx', 'Git', 'Linux', 'DBA', 'Performance Tuning'];
      // First check "Key Skills:" section if it exists
      const keySkillsMatch = jdContent.match(/Key Skills?:([\s\S]*?)(?:\n\n|\n[A-Z]|\$)/i);
      const searchContent = keySkillsMatch ? keySkillsMatch[1] : jdContent;
      // Match case-insensitive, word or partial (e.g., "Spring" matches "Spring Boot")
      const foundSkills = skillKeywords.filter(s => searchContent.toLowerCase().includes(s.toLowerCase()));
      if (foundSkills.length > 0) skills = foundSkills.slice(0, 8).join(', ');
    }
  }

  // If LinkedIn URL or direct URL
  let url = entry.ref;
  if (entry.ref.startsWith('local:jds/')) {
    // Keep local reference as-is
    url = entry.ref;
  } else if (entry.ref.includes('linkedin.com/jobs/view/')) {
    const idMatch = entry.ref.match(/view\/(\d+)/);
    if (idMatch) url = `https://www.linkedin.com/jobs/view/${idMatch[1]}`;
  }

  return { experience, skills, posted, applicants, url };
}

// Run scan.mjs --json to get portal results
function runScan() {
  console.log('Scanning portals...\n');
  try {
    const output = execSync('node scan.mjs --json', {
      encoding: 'utf-8',
      cwd: process.cwd(),
      env: { ...process.env, CAREER_OPS_DATA_DIR: DATA_ROOT }
    });
    // Find the JSON line (last line)
    const lines = output.trim().split('\n');
    const jsonLine = lines.find(l => l.startsWith('{"version"'));
    return jsonLine ? JSON.parse(jsonLine) : { added_urls: [] };
  } catch (e) {
    console.error('Scan failed:', e.message);
    return { added_urls: [] };
  }
}

// Build final consolidated table
function buildTable(pipelineEntries, scanResult) {
  const today = new Date().toISOString().split('T')[0];

  let html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Job Openings — ${today}</title>
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
    .experience { color: #718096; white-space: nowrap; }
    .skills { color: #4a5568; max-width: 250px; }
    .posted, .applicants { color: #718096; white-space: nowrap; }
    .url { max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .url a { color: #4c51bf; text-decoration: none; }
    .url a:hover { text-decoration: underline; }
    .empty { color: #a0aec0; }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>Job Pipeline</h1>
      <p>Last updated: ${today}</p>
    </header>
    <div class="stats">
      <div class="stat"><strong>Tracked:</strong> ${pipelineEntries.length}</div>
      <div class="stat"><strong>Fresh:</strong> ${scanResult.added_urls?.length || 0}</div>
    </div>
    <table>
      <thead>
        <tr>
          <th>Company</th>
          <th>Position</th>
          <th>Exp</th>
          <th>Skills</th>
          <th>Posted</th>
          <th>App</th>
          <th>Source</th>
        </tr>
      </thead>
      <tbody>
`;

  for (const entry of pipelineEntries) {
    const { experience, skills, posted, applicants, url } = extractDetailsFromPipeline(entry);
    const company = escapeHtml(entry.company);
    const role = escapeHtml(entry.role);

    html += `        <tr>
          <td class="company">${company}</td>
          <td class="role">${role}</td>
          <td class="experience">${experience === '—' ? '<span class="empty">—</span>' : experience}</td>
          <td class="skills">${skills === '—' ? '<span class="empty">—</span>' : escapeHtml(skills)}</td>
          <td class="posted">${posted === '—' ? '<span class="empty">—</span>' : posted}</td>
          <td class="applicants">${applicants === '—' ? '<span class="empty">—</span>' : applicants}</td>
          <td class="url"><a href="${url}" target="_blank">${url.startsWith('local:') ? 'local' : 'link'}</a></td>
        </tr>
`;
  }

  html += `      </tbody>
    </table>
  </div>
</body>
</html>`;
  return html;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, m => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[m]);
}

// Main
async function main() {
  const outputArg = process.argv.find(arg => arg.startsWith('--output='));
  const outputPath = outputArg ? outputArg.split('=')[1] : join(OUTPUT_DIR, `jobs-${new Date().toISOString().split('T')[0]}.html`);

  ensureDir(OUTPUT_DIR);

  console.log('Reading pipeline...');
  const pipelineEntries = parsePipeline();
  console.log(`Found ${pipelineEntries.length} pipeline entries`);

  const scanResult = runScan();

  const content = buildTable(pipelineEntries, scanResult);

  writeFileSync(outputPath, content);
  console.log(`\n✅ Production-ready consolidated list: ${outputPath}`);
}

main().catch(e => { console.error('Error:', e.message); process.exit(1); });