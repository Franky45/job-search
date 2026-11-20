/**
 * Title filter - positive/negative keywords with word/stem matching
 */

import { TitleFilter } from '../core/models.js';

interface CompiledKeyword {
  raw: string;
  match: (text: string) => boolean;
}

const WORD_BOUNDARY = /^[\p{L}\p{M}\p{N}]$/u;

function compileKeyword(keyword: string): (text: string) => boolean {
  const trimmed = keyword.trim().toLowerCase();
  if (!trimmed) return () => false;

  // Handle word: prefix (exact word match)
  if (trimmed.startsWith('word:')) {
    const word = trimmed.slice(5);
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(?<![\\p{L}\\p{M}\\p{N}])${escaped}(?![\\p{L}\\p{M}\\p{N}])`, 'u');
    return (text: string) => regex.test(text.toLowerCase());
  }

  // Handle stem: prefix (prefix match with word boundary)
  if (trimmed.startsWith('stem:')) {
    const stem = trimmed.slice(5);
    const escaped = stem.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(?<![\\p{L}\\p{M}\\p{N}])${escaped}[\\p{L}\\p{M}\\p{N}]*`, 'u');
    return (text: string) => regex.test(text.toLowerCase());
  }

  // Default: substring match with word boundary for short terms
  const codePoints = [...trimmed];
  const startsWord = WORD_BOUNDARY.test(codePoints[0] ?? '');
  const endsWord = WORD_BOUNDARY.test(codePoints.at(-1) ?? '');
  const prefix = startsWord ? '(?<![\\p{L}\\p{M}\\p{N}])' : '';
  const suffix = endsWord ? '(?![\\p{L}\\p{M}\\p{N}])' : '';
  const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`${prefix}${escaped}${suffix}`, 'u');
  return (text: string) => regex.test(text.toLowerCase());
}

function compileKeywordList(keywords: string[]): CompiledKeyword[] {
  return keywords
    .filter(k => typeof k === 'string' && k.trim().length > 0)
    .map(raw => ({ raw, match: compileKeyword(raw) }));
}

export function buildTitleFilter(titleFilter: TitleFilter): (title: string) => boolean {
  const positiveMatchers = compileKeywordList(titleFilter.positive || []);
  const negativeMatchers = compileKeywordList(titleFilter.negative || []);

  return (title: string): boolean => {
    if (!title || typeof title !== 'string') return false;

    const lower = title.toLowerCase();

    // If no positive filters, allow everything (unless negative matches)
    if (positiveMatchers.length === 0) {
      return !negativeMatchers.some(m => m.match(lower));
    }

    // Must match at least one positive keyword
    const positiveMatch = positiveMatchers.some(m => m.match(lower));
    if (!positiveMatch) return false;

    // Must not match any negative keyword
    const negativeMatch = negativeMatchers.some(m => m.match(lower));
    if (negativeMatch) return false;

    return true;
  };
}

export function getMatchedPositiveKeywords(title: string, titleFilter: TitleFilter): string[] {
  const positiveMatchers = compileKeywordList(titleFilter.positive || []);
  const lower = (title || '').toLowerCase();
  return positiveMatchers
    .filter(({ match }) => match(lower))
    .map(({ raw }) => raw);
}