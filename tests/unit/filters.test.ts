/**
 * Unit tests for filter modules
 */

import { describe, it, expect } from 'vitest';
import { buildTitleFilter, getMatchedPositiveKeywords } from '../../src/filters/title.js';
import { buildLocationFilter } from '../../src/filters/location.js';
import { buildExperienceFilter, extractExperience, getExperienceLabel } from '../../src/filters/experience.js';
import { buildAgeFilter, getAgeLabel } from '../../src/filters/age.js';

describe('Title Filter', () => {
  it('matches positive keywords', () => {
    const filter = buildTitleFilter({
      positive: ['Senior', 'Lead'],
      negative: []
    });
    expect(filter('Senior Software Engineer')).toBe(true);
    expect(filter('Lead Developer')).toBe(true);
    expect(filter('Software Engineer')).toBe(false);
  });

  it('rejects negative keywords', () => {
    const filter = buildTitleFilter({
      positive: ['Engineer'],
      negative: ['Intern', 'Junior']
    });
    expect(filter('Senior Engineer')).toBe(true);
    expect(filter('Junior Engineer')).toBe(false);
    expect(filter('Engineering Intern')).toBe(false);
  });

  it('handles word: prefix for exact match', () => {
    const filter = buildTitleFilter({
      positive: ['word:Lead'],
      negative: []
    });
    expect(filter('Lead Engineer')).toBe(true);
    expect(filter('Team Leader')).toBe(false); // Leader != Lead
  });

  it('handles stem: prefix for prefix match', () => {
    const filter = buildTitleFilter({
      positive: ['stem:develop'],
      negative: []
    });
    expect(filter('Developer')).toBe(true);
    expect(filter('Development')).toBe(true);
    expect(filter('Dev')).toBe(false);
  });

  it('returns matched positive keywords', () => {
    const filter = buildTitleFilter({
      positive: ['Senior', 'Lead', 'Principal'],
      negative: []
    });
    const matched = getMatchedPositiveKeywords('Senior Lead Engineer', filter);
    expect(matched).toContain('Senior');
    expect(matched).toContain('Lead');
  });
});

describe('Location Filter', () => {
  it('allows locations in allow list', () => {
    const filter = buildLocationFilter({
      allow: ['Bangalore', 'Remote'],
      block: []
    });
    expect(filter('Bangalore, Karnataka')).toBe(true);
    expect(filter('Remote')).toBe(true);
    expect(filter('Mumbai')).toBe(false);
  });

  it('blocks locations in block list', () => {
    const filter = buildLocationFilter({
      allow: [],
      block: ['India', 'China']
    });
    expect(filter('Bangalore, India')).toBe(false);
    expect(filter('Shanghai, China')).toBe(false);
    expect(filter('San Francisco, USA')).toBe(true);
  });

  it('always_allow overrides block', () => {
    const filter = buildLocationFilter({
      allow: [],
      block: ['India'],
      always_allow: ['Bangalore']
    });
    expect(filter('Bangalore, India')).toBe(true);
  });

  it('handles US state abbreviations when US in always_allow', () => {
    const filter = buildLocationFilter({
      allow: ['United States'],
      block: ['California'],
      always_allow: ['United States']
    });
    expect(filter('San Francisco, CA')).toBe(true); // CA is US state, US is allowed
  });
});

describe('Experience Filter', () => {
  it('extracts experience ranges', () => {
    const result = extractExperience('5-7 years of experience');
    expect(result).toEqual({ min: 5, max: 7 });
  });

  it('extracts minimum experience', () => {
    const result = extractExperience('minimum 3 years experience');
    expect(result).toEqual({ min: 3 });
  });

  it('extracts X+ years', () => {
    const result = extractExperience('5+ years required');
    expect(result).toEqual({ min: 5 });
  });

  it('returns null for no experience mentioned', () => {
    const result = extractExperience('We are looking for a passionate developer');
    expect(result).toBeNull();
  });

  it('filters by max years with stretch', () => {
    const filter = buildExperienceFilter({ maxYears: 5, stretchYears: 2 });
    expect(filter({ min: 3 })).toBe(true);      // within range
    expect(filter({ min: 5 })).toBe(true);      // at max
    expect(filter({ min: 6 })).toBe(true);      // within stretch
    expect(filter({ min: 8 })).toBe(false);     // exceeds stretch
    expect(filter({ min: 4, max: 6 })).toBe(true); // range within stretch
    expect(filter({ min: 10 })).toBe(false);    // way over
  });

  it('allows jobs with no experience requirement', () => {
    const filter = buildExperienceFilter({ maxYears: 5, stretchYears: 2 });
    expect(filter(null)).toBe(true);
  });

  it('formats experience label', () => {
    expect(getExperienceLabel({ min: 3, max: 5 })).toBe('3-5 yrs');
    expect(getExperienceLabel({ min: 5 })).toBe('5+ yrs');
    expect(getExperienceLabel(null)).toBe('—');
  });
});

describe('Age Filter', () => {
  it('filters by max age days', () => {
    const filter = buildAgeFilter(30);
    const today = new Date().toISOString().split('T')[0];
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const monthAgo = new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    expect(filter(today)).toBe(true);
    expect(filter(weekAgo)).toBe(true);
    expect(filter(monthAgo)).toBe(false);
  });

  it('allows unknown dates', () => {
    const filter = buildAgeFilter(30);
    expect(filter(undefined)).toBe(true);
    expect(filter('')).toBe(true);
    expect(filter('invalid')).toBe(true);
  });

  it('formats age label', () => {
    const today = new Date().toISOString().split('T')[0];
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    expect(getAgeLabel(today)).toBe('Today');
    expect(getAgeLabel(weekAgo)).toContain('days ago');
  });
});