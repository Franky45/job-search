/**
 * Provider registry - auto-loads all providers from providers/ directory
 */
import { readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { pathToFileURL } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROVIDERS_DIR = join(__dirname);
export class ProviderRegistry {
    providers = new Map();
    loaded = false;
    async loadAll() {
        if (this.loaded)
            return this.providers;
        const files = readdirSync(PROVIDERS_DIR)
            .filter(f => f.endsWith('.ts') && !f.startsWith('_') && f !== 'base.ts' && f !== 'registry.ts' && f !== 'http.ts')
            .sort();
        for (const file of files) {
            const fullPath = join(PROVIDERS_DIR, file);
            try {
                const module = await import(pathToFileURL(fullPath).href);
                const provider = module.default;
                if (!provider || typeof provider.id !== 'string' || typeof provider.fetch !== 'function') {
                    console.warn(`⚠️  ${file}: skipping — invalid provider module`);
                    continue;
                }
                if (this.providers.has(provider.id)) {
                    console.warn(`⚠️  ${file}: duplicate provider id "${provider.id}" — keeping first`);
                    continue;
                }
                this.providers.set(provider.id, provider);
                console.log(`✅ Loaded provider: ${provider.id} (${provider.name})`);
            }
            catch (error) {
                console.error(`❌ ${file}: failed to load — ${error.message}`);
            }
        }
        this.loaded = true;
        return this.providers;
    }
    getProvider(id) {
        return this.providers.get(id);
    }
    getAllProviders() {
        return Array.from(this.providers.values());
    }
    /**
     * Resolve which provider handles a given entry
     * 1. Explicit provider field wins
     * 2. Run detect() on each provider in load order
     */
    async resolveProvider(entry) {
        // 1. Explicit provider
        if (entry.provider) {
            const provider = this.providers.get(entry.provider);
            if (provider)
                return provider;
            console.warn(`⚠️  Unknown provider: ${entry.provider}`);
        }
        // 2. Auto-detect
        for (const provider of this.providers.values()) {
            try {
                const detected = await provider.detect(entry);
                if (detected) {
                    return provider;
                }
            }
            catch (error) {
                console.warn(`⚠️  ${provider.id}.detect() failed: ${error.message}`);
            }
        }
        return null;
    }
    clear() {
        this.providers.clear();
        this.loaded = false;
    }
}
// Singleton instance
export const providerRegistry = new ProviderRegistry();
// Convenience function
export async function getProviders() {
    return providerRegistry.loadAll();
}
export async function resolveProvider(entry) {
    if (!providerRegistry['loaded']) {
        await providerRegistry.loadAll();
    }
    return providerRegistry.resolveProvider(entry);
}
//# sourceMappingURL=registry.js.map