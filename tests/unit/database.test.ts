/**
 * Unit tests for database operations
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { JobDatabase } from '../../src/core/database.js';
import { Job, Company, ScanRun } from '../../src/core/models.js';
import { join } from 'path';
import { tmpdir } from 'os';

const TEST_DB_PATH = join(tmpdir(), 'career-ops-test.db');

describe('JobDatabase', () => {
  let db: JobDatabase;

  beforeAll(() => {
    JobDatabase.resetInstance();
    db = JobDatabase.getInstance(TEST_DB_PATH);
  });

  afterAll(() => {
    db.close();
    JobDatabase.resetInstance();
  });

  it('inserts and retrieves a job', () => {
    const job: Omit<Job, 'id'> = {
      canonical_url: 'https://example.com/job/1',
      source_url: 'https://example.com/job/1',
      provider: 'test',
      company: 'Test Company',
      title: 'Software Engineer',
      location: 'Bangalore',
      description: 'Test description',
      discovered_date: new Date().toISOString(),
      status: 'new'
    };

    const id = db.insertJob(job);
    expect(id).toBeGreaterThan(0);

    const retrieved = db.getJobById(id);
    expect(retrieved).not.toBeNull();
    expect(retrieved!.company).toBe('Test Company');
    expect(retrieved!.title).toBe('Software Engineer');
    expect(retrieved!.status).toBe('new');
  });

  it('upserts job (insert new, update existing)', () => {
    const job: Omit<Job, 'id'> = {
      canonical_url: 'https://example.com/job/upsert',
      source_url: 'https://example.com/job/upsert',
      provider: 'test',
      company: 'Upsert Company',
      title: 'Original Title',
      discovered_date: new Date().toISOString(),
      status: 'new'
    };

    // First insert
    const { id, isNew } = db.upsertJob(job);
    expect(isNew).toBe(true);

    // Update with upsert
    const { id: id2, isNew: isNew2 } = db.upsertJob({
      ...job,
      title: 'Updated Title',
      status: 'evaluated'
    });
    expect(isNew2).toBe(false);
    expect(id2).toBe(id);

    const retrieved = db.getJobById(id);
    expect(retrieved!.title).toBe('Updated Title');
    expect(retrieved!.status).toBe('evaluated');
  });

  it('deduplicates by canonical_url', () => {
    const job: Omit<Job, 'id'> = {
      canonical_url: 'https://example.com/job/dedup',
      source_url: 'https://example.com/job/dedup',
      provider: 'test',
      company: 'Dedup Company',
      title: 'Job 1',
      discovered_date: new Date().toISOString(),
      status: 'new'
    };

    db.insertJob(job);
    const count = db.getJobCount({ company: 'Dedup Company' });
    expect(count).toBe(1);

    // Try to insert same canonical URL
    db.insertJob({ ...job, title: 'Job 2' });
    const count2 = db.getJobCount({ company: 'Dedup Company' });
    expect(count2).toBe(1); // Should still be 1
  });

  it('queries jobs with filters', () => {
    // Insert test jobs
    const jobs: Omit<Job, 'id'>[] = [
      { canonical_url: 'https://a.com/1', provider: 'p1', company: 'Company A', title: 'Engineer', status: 'new', discovered_date: new Date().toISOString() },
      { canonical_url: 'https://b.com/1', provider: 'p2', company: 'Company B', title: 'Manager', status: 'applied', discovered_date: new Date().toISOString() },
      { canonical_url: 'https://c.com/1', provider: 'p1', company: 'Company A', title: 'Lead', status: 'interview', discovered_date: new Date().toISOString() }
    ];

    for (const job of jobs) {
      db.insertJob(job);
    }

    // Filter by status
    const newJobs = db.getJobs({ status: 'new' });
    expect(newJobs.length).toBeGreaterThanOrEqual(1);

    // Filter by company
    const companyAJobs = db.getJobs({ company: 'Company A' });
    expect(companyAJobs.length).toBeGreaterThanOrEqual(2);

    // Filter by provider
    const provider1Jobs = db.getJobs({ provider: 'p1' });
    expect(provider1Jobs.length).toBeGreaterThanOrEqual(2);

    // Limit and offset
    const limited = db.getJobs({ limit: 1 });
    expect(limited.length).toBe(1);
  });

  it('manages companies', () => {
    const company: Omit<Company, 'id'> = {
      name: 'Test Corp',
      provider: 'test',
      provider_id: 'testcorp',
      enabled: true,
      created_date: new Date().toISOString(),
      updated_date: new Date().toISOString()
    };

    const id = db.insertCompany(company);
    expect(id).toBeGreaterThan(0);

    const retrieved = db.getCompanyByName('Test Corp');
    expect(retrieved).not.toBeNull();
    expect(retrieved!.provider_id).toBe('testcorp');

    const companies = db.getCompanies();
    expect(companies.length).toBeGreaterThanOrEqual(1);
  });

  it('records scan runs', () => {
    const run: Omit<ScanRun, 'id'> = {
      run_date: new Date().toISOString(),
      companies_scanned: 5,
      jobs_found: 100,
      jobs_new: 10,
      jobs_filtered: 90,
      duration_ms: 5000
    };

    const id = db.insertScanRun(run);
    expect(id).toBeGreaterThan(0);

    const runs = db.getScanRuns();
    expect(runs.length).toBeGreaterThanOrEqual(1);
    expect(runs[0].companies_scanned).toBe(5);
  });

  it('manages user profile', () => {
    db.setProfile('test_key', 'test_value');
    const value = db.getProfile('test_key');
    expect(value).toBe('test_value');

    const all = db.getAllProfile();
    expect(all.length).toBeGreaterThanOrEqual(1);
  });

  it('manages pipeline entries', () => {
    const id = db.addPipelineEntry({
      url: 'https://example.com/job',
      company: 'Pipeline Co',
      title: 'Pipeline Job',
      notes: 'Test note'
    });

    expect(id).toBeGreaterThan(0);

    const entries = db.getPipelineEntries();
    expect(entries.length).toBeGreaterThanOrEqual(1);
    expect(entries[0].company).toBe('Pipeline Co');

    db.removePipelineEntry(id);
    const afterRemoval = db.getPipelineEntries();
    expect(afterRemoval.length).toBe(entries.length - 1);
  });
});