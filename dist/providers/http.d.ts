/**
 * HTTP client with caching, rate limiting, and retry logic
 */
import { RequestInit, Headers } from 'undici';
export interface CacheEntry {
    data: string;
    headers: Record<string, string>;
    timestamp: number;
    etag?: string;
    lastModified?: string;
}
export interface HttpClientOptions {
    timeout?: number;
    retries?: number;
    retryDelay?: number;
    userAgent?: string;
    headers?: Record<string, string>;
}
export interface FetchResult<T = string> {
    data: T;
    status: number;
    headers: Headers;
    fromCache: boolean;
}
export declare function createHttpClient(options?: HttpClientOptions): {
    get: <T = string>(url: string, cacheKey?: string) => Promise<FetchResult<T>>;
    post: <T = string>(url: string, body: any, cacheKey?: string) => Promise<FetchResult<T>>;
    request: <T = string>(url: string, init?: RequestInit, cacheKey?: string) => Promise<FetchResult<T>>;
};
export declare function createCache(): {
    get: (key: string) => CacheEntry | null;
    set: (key: string, data: string, headers: Record<string, string>, etag?: string, lastModified?: string) => void;
    clear: () => void;
    stats: () => {
        size: number;
        entries: number;
    };
};
export declare class ConcurrencyLimiter {
    private running;
    private queue;
    private readonly limit;
    constructor(limit: number);
    run<T>(fn: () => Promise<T>): Promise<T>;
    private processQueue;
}
export declare function fetchWithConcurrency<T>(urls: string[], fetcher: (url: string) => Promise<T>, concurrency: number): Promise<{
    results: T[];
    errors: Map<string, Error>;
}>;
//# sourceMappingURL=http.d.ts.map