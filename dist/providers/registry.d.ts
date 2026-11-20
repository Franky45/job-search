/**
 * Provider registry - auto-loads all providers from providers/ directory
 */
import { BaseProvider } from './base.js';
import { ProviderEntry } from '../core/models.js';
export declare class ProviderRegistry {
    private providers;
    private loaded;
    loadAll(): Promise<Map<string, BaseProvider>>;
    getProvider(id: string): BaseProvider | undefined;
    getAllProviders(): BaseProvider[];
    /**
     * Resolve which provider handles a given entry
     * 1. Explicit provider field wins
     * 2. Run detect() on each provider in load order
     */
    resolveProvider(entry: ProviderEntry): Promise<BaseProvider | null>;
    clear(): void;
}
export declare const providerRegistry: ProviderRegistry;
export declare function getProviders(): Promise<Map<string, BaseProvider>>;
export declare function resolveProvider(entry: ProviderEntry): Promise<BaseProvider | null>;
//# sourceMappingURL=registry.d.ts.map