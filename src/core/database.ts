/**
 * SQLite database layer for Career-Ops v2
 * Uses sql.js (WASM) for cross-platform compatibility
 */

import initSqlJs, { Database } from 'sql.js';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync, existsSync, readFileSync, writeFileSync } from 'fs';
import { homedir } from 'os';
import {
  Job,
  Company,
  ScanRun,
  UserProfile,
  JobStatus
} from './models.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class JobDatabase {
  private db: Database | null = null;
  private dbPath: string;
  private static instance: JobDatabase | null = null;
  private sqlJs: any = null;

  private constructor(dbPath: string) {
    this.dbPath = dbPath;
  }

  static async getInstance(dbPath?: string): Promise<JobDatabase> {
    if (!JobDatabase.instance) {
      const path = dbPath || join(homedir(), '.local', 'share', 'career-ops', 'jobs.sqlite');
      JobDatabase.instance = new JobDatabase(path);
      await JobDatabase.instance.init();
    }
    return JobDatabase.instance;
  }

  static resetInstance(): void {
    if (JobDatabase.instance) {
      JobDatabase.instance.close();
      JobDatabase.instance = null;
    }
  }

  private async init(): Promise<void> {
    // Load sql.js WASM
    this.sqlJs = await initSqlJs({
      locateFile: () => new URL('sql.js/dist/sql-wasm.wasm', import.meta.url).href
    });

    // Ensure directory exists
    const dbDir = join(this.dbPath, '..');
    if (!existsSync(dbDir)) {
      mkdirSync(dbDir, { recursive: true });
    }

    // Load existing database or create new
    if (existsSync(this.dbPath)) {
      const fileBuffer = readFileSync(this.dbPath);
      this.db = new this.sqlJs.Database(fileBuffer);
    } else {
      this.db = new this.sqlJs.Database();
    }

    this.initializeSchema();
    this.save();
  }

  private initializeSchema(): void {
    if (!this.db) return;

    // Jobs table - core job storage
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS jobs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        canonical_url TEXT UNIQUE NOT NULL,
        source_url TEXT,
        provider TEXT NOT NULL,
        company TEXT NOT NULL,
        company_slug TEXT,
        title TEXT NOT NULL,
        location TEXT,
        description TEXT,
        description_html TEXT,
        posted_date TEXT,
        discovered_date TEXT DEFAULT (datetime('now')),
        salary_min INTEGER,
        salary_max INTEGER,
        salary_currency TEXT,
        experience_min INTEGER,
        experience_max INTEGER,
        remote_type TEXT CHECK(remote_type IN ('remote', 'hybrid', 'onsite')),
        employment_type TEXT,
        tags TEXT,
        status TEXT DEFAULT 'new' CHECK(status IN ('new', 'evaluated', 'applied', 'interview', 'offer', 'rejected', 'discarded')),
        score REAL,
        report_path TEXT,
        cv_path TEXT,
        notes TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
      CREATE INDEX IF NOT EXISTS idx_jobs_company ON jobs(company);
      CREATE INDEX IF NOT EXISTS idx_jobs_posted ON jobs(posted_date);
      CREATE INDEX IF NOT EXISTS idx_jobs_provider ON jobs(provider);
      CREATE INDEX IF NOT EXISTS idx_jobs_canonical_url ON jobs(canonical_url);
      CREATE INDEX IF NOT EXISTS idx_jobs_company_slug ON jobs(company_slug);
    `);

    // Companies table - configured companies to scan
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS companies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        provider TEXT,
        provider_id TEXT,
        careers_url TEXT,
        enabled INTEGER DEFAULT 1,
        title_filter_positive TEXT,
        title_filter_negative TEXT,
        location_allow TEXT,
        location_block TEXT,
        experience_max_years INTEGER,
        created_date TEXT DEFAULT (datetime('now')),
        updated_date TEXT DEFAULT (datetime('now'))
      );

      CREATE INDEX IF NOT EXISTS idx_companies_enabled ON companies(enabled);
      CREATE INDEX IF NOT EXISTS idx_companies_provider ON companies(provider);
    `);

    // Scan runs table - history of scan operations
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS scan_runs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        run_date TEXT DEFAULT (datetime('now')),
        companies_scanned INTEGER,
        jobs_found INTEGER,
        jobs_new INTEGER,
        jobs_filtered INTEGER,
        duration_ms INTEGER,
        errors TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_scan_runs_date ON scan_runs(run_date);
    `);

    // User profile table - key-value storage
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS user_profile (
        key TEXT PRIMARY KEY,
        value TEXT
      );
    `);

    // Pipeline entries - manual user entries
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS pipeline_entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        url TEXT NOT NULL,
        company TEXT,
        title TEXT,
        location TEXT,
        notes TEXT,
        checked INTEGER DEFAULT 0,
        created_date TEXT DEFAULT (datetime('now'))
      );
    `);
  }

  private save(): void {
    if (!this.db) return;
    const data = this.db.export();
    writeFileSync(this.dbPath, Buffer.from(data));
  }

  // Job operations
  insertJob(job: Omit<Job, 'id'>): number {
    if (!this.db) throw new Error('Database not initialized');

    const stmt = this.db.prepare(`
      INSERT INTO jobs (
        canonical_url, source_url, provider, company, company_slug, title,
        location, description, description_html, posted_date, discovered_date,
        salary_min, salary_max, salary_currency, experience_min, experience_max,
        remote_type, employment_type, tags, status, score, report_path, cv_path, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const tagsJson = job.tags ? JSON.stringify(job.tags) : null;

    stmt.run([
      job.canonical_url,
      job.source_url,
      job.provider,
      job.company,
      job.company_slug,
      job.title,
      job.location,
      job.description,
      job.description_html,
      job.posted_date,
      job.discovered_date,
      job.salary_min,
      job.salary_max,
      job.salary_currency,
      job.experience_min,
      job.experience_max,
      job.remote_type,
      job.employment_type,
      tagsJson,
      job.status,
      job.score,
      job.report_path,
      job.cv_path,
      job.notes
    ]);

    stmt.free();
    this.save();

    // Get the last insert rowid
    const result = this.db.exec('SELECT last_insert_rowid() as id');
    return result[0]?.values[0]?.[0] as number || 0;
  }

  upsertJob(job: Omit<Job, 'id'>): { id: number; isNew: boolean } {
    const existing = this.getJobByCanonicalUrl(job.canonical_url);
    if (existing) {
      this.updateJob(existing.id!, job);
      return { id: existing.id!, isNew: false };
    }
    const id = this.insertJob(job);
    return { id, isNew: true };
  }

  getJobByCanonicalUrl(canonicalUrl: string): Job | null {
    if (!this.db) return null;
    const stmt = this.db.prepare('SELECT * FROM jobs WHERE canonical_url = ?');
    stmt.bind([canonicalUrl]);
    const row = stmt.getAsObject();
    stmt.free();
    return row ? this.mapRowToJob(row) : null;
  }

  getJobById(id: number): Job | null {
    if (!this.db) return null;
    const stmt = this.db.prepare('SELECT * FROM jobs WHERE id = ?');
    stmt.bind([id]);
    const row = stmt.getAsObject();
    stmt.free();
    return row ? this.mapRowToJob(row) : null;
  }

  updateJob(id: number, job: Partial<Omit<Job, 'id'>>): void {
    if (!this.db) return;

    const fields = Object.keys(job).filter(k => job[k as keyof Job] !== undefined);
    if (fields.length === 0) return;

    const setClause = fields.map(f => `${f} = ?`).join(', ');
    const values = fields.map(f => {
      const val = job[f as keyof Job];
      return Array.isArray(val) ? JSON.stringify(val) : val;
    });

    const stmt = this.db.prepare(`UPDATE jobs SET ${setClause} WHERE id = ?`);
    stmt.run([...values, id]);
    stmt.free();
    this.save();
  }

  getJobs(filters?: {
    status?: JobStatus;
    company?: string;
    provider?: string;
    limit?: number;
    offset?: number;
    orderBy?: string;
    orderDir?: 'ASC' | 'DESC';
  }): Job[] {
    if (!this.db) return [];

    let sql = 'SELECT * FROM jobs WHERE 1=1';
    const params: any[] = [];

    if (filters?.status) {
      sql += ' AND status = ?';
      params.push(filters.status);
    }
    if (filters?.company) {
      sql += ' AND company LIKE ?';
      params.push(`%${filters.company}%`);
    }
    if (filters?.provider) {
      sql += ' AND provider = ?';
      params.push(filters.provider);
    }

    sql += ` ORDER BY ${filters?.orderBy || 'discovered_date'} ${filters?.orderDir || 'DESC'}`;

    if (filters?.limit) {
      sql += ' LIMIT ?';
      params.push(filters.limit);
    }
    if (filters?.offset) {
      sql += ' OFFSET ?';
      params.push(filters.offset);
    }

    const stmt = this.db.prepare(sql);
    stmt.bind(params);
    const rows: any[] = [];
    while (stmt.step()) {
      rows.push(stmt.getAsObject());
    }
    stmt.free();

    return rows.map(r => this.mapRowToJob(r));
  }

  getJobCount(filters?: { status?: JobStatus; company?: string }): number {
    if (!this.db) return 0;

    let sql = 'SELECT COUNT(*) as count FROM jobs WHERE 1=1';
    const params: any[] = [];

    if (filters?.status) {
      sql += ' AND status = ?';
      params.push(filters.status);
    }
    if (filters?.company) {
      sql += ' AND company LIKE ?';
      params.push(`%${filters.company}%`);
    }

    const stmt = this.db.prepare(sql);
    stmt.bind(params);
    let count = 0;
    if (stmt.step()) {
      count = stmt.get()[0] as number;
    }
    stmt.free();
    return count;
  }

  // Company operations
  insertCompany(company: Omit<Company, 'id'>): number {
    if (!this.db) throw new Error('Database not initialized');

    const stmt = this.db.prepare(`
      INSERT INTO companies (
        name, provider, provider_id, careers_url, enabled,
        title_filter_positive, title_filter_negative,
        location_allow, location_block, experience_max_years
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run([
      company.name,
      company.provider,
      company.provider_id,
      company.careers_url,
      company.enabled ? 1 : 0,
      company.title_filter_positive ? JSON.stringify(company.title_filter_positive) : null,
      company.title_filter_negative ? JSON.stringify(company.title_filter_negative) : null,
      company.location_allow ? JSON.stringify(company.location_allow) : null,
      company.location_block ? JSON.stringify(company.location_block) : null,
      company.experience_max_years
    ]);

    stmt.free();
    this.save();

    const result = this.db.exec('SELECT last_insert_rowid() as id');
    return result[0]?.values[0]?.[0] as number || 0;
  }

  upsertCompany(company: Omit<Company, 'id'>): number {
    const existing = this.getCompanyByName(company.name);
    if (existing) {
      this.updateCompany(existing.id!, company);
      return existing.id!;
    }
    return this.insertCompany(company);
  }

  getCompanyByName(name: string): Company | null {
    if (!this.db) return null;
    const stmt = this.db.prepare('SELECT * FROM companies WHERE name = ?');
    stmt.bind([name]);
    const row = stmt.getAsObject();
    stmt.free();
    return row ? this.mapRowToCompany(row) : null;
  }

  getCompanyById(id: number): Company | null {
    if (!this.db) return null;
    const stmt = this.db.prepare('SELECT * FROM companies WHERE id = ?');
    stmt.bind([id]);
    const row = stmt.getAsObject();
    stmt.free();
    return row ? this.mapRowToCompany(row) : null;
  }

  updateCompany(id: number, company: Partial<Omit<Company, 'id'>>): void {
    if (!this.db) return;

    const fields = Object.keys(company).filter(k => company[k as keyof Company] !== undefined);
    if (fields.length === 0) return;

    const setClause = fields.map(f => `${f} = ?`).join(', ');
    const values = fields.map(f => {
      const val = company[f as keyof Company];
      return Array.isArray(val) ? JSON.stringify(val) : val;
    });

    const stmt = this.db.prepare(`UPDATE companies SET ${setClause}, updated_date = datetime('now') WHERE id = ?`);
    stmt.run([...values, id]);
    stmt.free();
    this.save();
  }

  getCompanies(enabledOnly = true): Company[] {
    if (!this.db) return [];

    const sql = enabledOnly
      ? 'SELECT * FROM companies WHERE enabled = 1 ORDER BY name'
      : 'SELECT * FROM companies ORDER BY name';

    const stmt = this.db.prepare(sql);
    const rows: any[] = [];
    while (stmt.step()) {
      rows.push(stmt.getAsObject());
    }
    stmt.free();

    return rows.map(r => this.mapRowToCompany(r));
  }

  deleteCompany(id: number): void {
    if (!this.db) return;
    this.db.prepare('DELETE FROM companies WHERE id = ?').run([id]);
    this.save();
  }

  // Scan run operations
  insertScanRun(run: Omit<ScanRun, 'id'>): number {
    if (!this.db) throw new Error('Database not initialized');

    const stmt = this.db.prepare(`
      INSERT INTO scan_runs (
        run_date, companies_scanned, jobs_found, jobs_new, jobs_filtered, duration_ms, errors
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run([
      run.run_date,
      run.companies_scanned,
      run.jobs_found,
      run.jobs_new,
      run.jobs_filtered,
      run.duration_ms,
      run.errors
    ]);

    stmt.free();
    this.save();

    const result = this.db.exec('SELECT last_insert_rowid() as id');
    return result[0]?.values[0]?.[0] as number || 0;
  }

  getScanRuns(limit = 50): ScanRun[] {
    if (!this.db) return [];

    const stmt = this.db.prepare('SELECT * FROM scan_runs ORDER BY run_date DESC LIMIT ?');
    stmt.bind([limit]);
    const rows: any[] = [];
    while (stmt.step()) {
      rows.push(stmt.getAsObject());
    }
    stmt.free();

    return rows as ScanRun[];
  }

  // User profile operations
  setProfile(key: string, value: string): void {
    if (!this.db) return;
    this.db.prepare('INSERT OR REPLACE INTO user_profile (key, value) VALUES (?, ?)').run([key, value]);
    this.save();
  }

  getProfile(key: string): string | null {
    if (!this.db) return null;
    const stmt = this.db.prepare('SELECT value FROM user_profile WHERE key = ?');
    stmt.bind([key]);
    const row = stmt.getAsObject();
    stmt.free();
    return row?.value ?? null;
  }

  getAllProfile(): UserProfile[] {
    if (!this.db) return [];
    const stmt = this.db.prepare('SELECT * FROM user_profile');
    const rows: any[] = [];
    while (stmt.step()) {
      rows.push(stmt.getAsObject());
    }
    stmt.free();
    return rows as UserProfile[];
  }

  // Pipeline operations
  addPipelineEntry(entry: { url: string; company?: string; title?: string; location?: string; notes?: string }): number {
    if (!this.db) throw new Error('Database not initialized');

    const stmt = this.db.prepare(`
      INSERT INTO pipeline_entries (url, company, title, location, notes)
      VALUES (?, ?, ?, ?, ?)
    `);

    stmt.run([entry.url, entry.company, entry.title, entry.location, entry.notes]);
    stmt.free();
    this.save();

    const result = this.db.exec('SELECT last_insert_rowid() as id');
    return result[0]?.values[0]?.[0] as number || 0;
  }

  getPipelineEntries(): any[] {
    if (!this.db) return [];

    const stmt = this.db.prepare('SELECT * FROM pipeline_entries ORDER BY created_date DESC');
    const rows: any[] = [];
    while (stmt.step()) {
      rows.push(stmt.getAsObject());
    }
    stmt.free();
    return rows;
  }

  removePipelineEntry(id: number): void {
    if (!this.db) return;
    this.db.prepare('DELETE FROM pipeline_entries WHERE id = ?').run([id]);
    this.save();
  }

  updatePipelineEntryChecked(id: number, checked: boolean): void {
    if (!this.db) return;
    this.db.prepare('UPDATE pipeline_entries SET checked = ? WHERE id = ?').run([checked ? 1 : 0, id]);
    this.save();
  }

  // Utility
  close(): void {
    if (this.db) {
      this.save();
      this.db.close();
      this.db = null;
    }
  }

  private mapRowToJob(row: any): Job {
    return {
      id: row.id,
      canonical_url: row.canonical_url,
      source_url: row.source_url,
      provider: row.provider,
      company: row.company,
      company_slug: row.company_slug,
      title: row.title,
      location: row.location,
      description: row.description,
      description_html: row.description_html,
      posted_date: row.posted_date,
      discovered_date: row.discovered_date,
      salary_min: row.salary_min,
      salary_max: row.salary_max,
      salary_currency: row.salary_currency,
      experience_min: row.experience_min,
      experience_max: row.experience_max,
      remote_type: row.remote_type,
      employment_type: row.employment_type,
      tags: row.tags ? JSON.parse(row.tags) : undefined,
      status: row.status,
      score: row.score,
      report_path: row.report_path,
      cv_path: row.cv_path,
      notes: row.notes
    };
  }

  private mapRowToCompany(row: any): Company {
    return {
      id: row.id,
      name: row.name,
      provider: row.provider,
      provider_id: row.provider_id,
      careers_url: row.careers_url,
      enabled: Boolean(row.enabled),
      title_filter_positive: row.title_filter_positive ? JSON.parse(row.title_filter_positive) : undefined,
      title_filter_negative: row.title_filter_negative ? JSON.parse(row.title_filter_negative) : undefined,
      location_allow: row.location_allow ? JSON.parse(row.location_allow) : undefined,
      location_block: row.location_block ? JSON.parse(row.location_block) : undefined,
      experience_max_years: row.experience_max_years,
      created_date: row.created_date,
      updated_date: row.updated_date
    };
  }
}

// Export async getter
export async function getDatabase(dbPath?: string): Promise<JobDatabase> {
  return JobDatabase.getInstance(dbPath);
}