/**
 * HTTP client with caching, rate limiting, and retry logic
 */
import { fetch, Headers } from 'undici';
import { createHash } from 'crypto';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync, existsSync, readFileSync, writeFileSync, unlinkSync } from 'fs';
import { homedir } from 'os';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// Cache directory
const CACHE_DIR = join(homedir(), '.cache', 'career-ops', 'http');
if (!existsSync(CACHE_DIR)) {
    mkdirSync(CACHE_DIR, { recursive: true });
}
const DEFAULT_TIMEOUT = 30000;
const DEFAULT_RETRIES = 3;
const DEFAULT_RETRY_DELAY = 1000;
const DEFAULT_USER_AGENT = 'Career-Ops/2.0 (+https://github.com/career-ops-hq/career-ops)';
export function createHttpClient(options = {}) {
    const { timeout = DEFAULT_TIMEOUT, retries = DEFAULT_RETRIES, retryDelay = DEFAULT_RETRY_DELAY, userAgent = DEFAULT_USER_AGENT, headers = {} } = options;
    const defaultHeaders = new Headers({
        'User-Agent': userAgent,
        'Accept': 'application/json, text/html, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        ...headers
    });
    async function request(url, init = {}, cacheKey) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        const requestHeaders = new Headers(defaultHeaders);
        if (init.headers) {
            Object.entries(init.headers).forEach(([k, v]) => requestHeaders.set(k, v));
        }
        // Check cache first for GET requests
        const method = init.method || 'GET';
        const useCache = method === 'GET' && cacheKey;
        if (useCache) {
            const cached = getFromCache(cacheKey);
            if (cached) {
                // Add conditional headers
                if (cached.etag)
                    requestHeaders.set('If-None-Match', cached.etag);
                if (cached.lastModified)
                    requestHeaders.set('If-Modified-Since', cached.lastModified);
            }
        }
        let lastError = null;
        for (let attempt = 0; attempt <= retries; attempt++) {
            try {
                const response = await fetch(url, {
                    ...init,
                    headers: requestHeaders,
                    signal: controller.signal,
                    redirect: 'follow'
                });
                clearTimeout(timeoutId);
                // Handle 304 Not Modified
                if (response.status === 304 && useCache) {
                    const cached = getFromCache(cacheKey);
                    if (cached) {
                        return {
                            data: cached.data,
                            status: 200,
                            headers: response.headers,
                            fromCache: true
                        };
                    }
                }
                // Handle rate limiting
                if (response.status === 429) {
                    const retryAfter = response.headers.get('Retry-After');
                    const waitTime = retryAfter ? parseInt(retryAfter, 10) * 1000 : retryDelay * Math.pow(2, attempt);
                    await sleep(waitTime);
                    continue;
                }
                const data = await response.text();
                // Cache successful responses
                if (useCache && response.ok) {
                    const etag = response.headers.get('ETag') || undefined;
                    const lastModified = response.headers.get('Last-Modified') || undefined;
                    saveToCache(cacheKey, data, Object.fromEntries(response.headers), etag, lastModified);
                }
                return {
                    data: data,
                    status: response.status,
                    headers: response.headers,
                    fromCache: false
                };
            }
            catch (error) {
                clearTimeout(timeoutId);
                lastError = error;
                // Don't retry on abort or client errors
                if (error instanceof Error && error.name === 'AbortError') {
                    throw new Error(`Request timeout after ${timeout}ms`);
                }
                if (attempt < retries) {
                    await sleep(retryDelay * Math.pow(2, attempt));
                }
            }
        }
        throw lastError || new Error('Request failed after retries');
    }
    return {
        get: (url, cacheKey) => request(url, { method: 'GET' }, cacheKey),
        post: (url, body, cacheKey) => request(url, {
            method: 'POST',
            body: typeof body === 'string' ? body : JSON.stringify(body),
            headers: { 'Content-Type': 'application/json' }
        }, cacheKey),
        request
    };
}
export function createCache() {
    function getCachePath(key) {
        const hash = createHash('sha256').update(key).digest('hex');
        return join(CACHE_DIR, `${hash}.json`);
    }
    function getFromCache(key) {
        const path = getCachePath(key);
        if (!existsSync(path))
            return null;
        try {
            const content = readFileSync(path, 'utf-8');
            const entry = JSON.parse(content);
            // Check if expired (24 hours default)
            const maxAge = 24 * 60 * 60 * 1000;
            if (Date.now() - entry.timestamp > maxAge) {
                unlinkSync(path);
                return null;
            }
            return entry;
        }
        catch {
            return null;
        }
    }
    function saveToCache(key, data, headers, etag, lastModified) {
        const path = getCachePath(key);
        const entry = {
            data,
            headers,
            timestamp: Date.now(),
            etag,
            lastModified
        };
        writeFileSync(path, JSON.stringify(entry), 'utf-8');
    }
    function clearCache() {
        if (existsSync(CACHE_DIR)) {
            const files = readFileSync(CACHE_DIR, 'utf-8');
            // Actually list files
            const fs = require('fs');
            fs.readdirSync(CACHE_DIR).forEach((file) => {
                unlinkSync(join(CACHE_DIR, file));
            });
        }
    }
    function getCacheStats() {
        if (!existsSync(CACHE_DIR))
            return { size: 0, entries: 0 };
        const fs = require('fs');
        const files = fs.readdirSync(CACHE_DIR);
        let totalSize = 0;
        files.forEach((file) => {
            const stats = fs.statSync(join(CACHE_DIR, file));
            totalSize += stats.size;
        });
        return { size: totalSize, entries: files.length };
    }
    return {
        get: getFromCache,
        set: saveToCache,
        clear: clearCache,
        stats: getCacheStats
    };
}
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
// Concurrency limiter
export class ConcurrencyLimiter {
    running = 0;
    queue = [];
    limit;
    constructor(limit) {
        this.limit = limit;
    }
    async run(fn) {
        if (this.running < this.limit) {
            this.running++;
            try {
                return await fn();
            }
            finally {
                this.running--;
                this.processQueue();
            }
        }
        return new Promise((resolve, reject) => {
            this.queue.push(async () => {
                try {
                    const result = await fn();
                    resolve(result);
                }
                catch (error) {
                    reject(error);
                }
            });
            this.processQueue();
        });
    }
    processQueue() {
        if (this.queue.length > 0 && this.running < this.limit) {
            this.running++;
            const next = this.queue.shift();
            next().finally(() => {
                this.running--;
                this.processQueue();
            });
        }
    }
}
export async function fetchWithConcurrency(urls, fetcher, concurrency) {
    const limiter = new ConcurrencyLimiter(concurrency);
    const results = [];
    const errors = new Map();
    const promises = urls.map(url => limiter.run(async () => {
        try {
            const result = await fetcher(url);
            results.push(result);
            return result;
        }
        catch (error) {
            errors.set(url, error);
            throw error;
        }
    }));
    await Promise.allSettled(promises);
    return { results, errors };
}
//# sourceMappingURL=http.js.map