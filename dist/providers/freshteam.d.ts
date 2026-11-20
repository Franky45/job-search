/**
 * Freshteam provider - Freshworks ATS platform
 * Used by: 5,000+ companies globally, popular in India
 */
import { BaseProvider } from './base.js';
import { ProviderEntry, ProviderJob, FetchContext } from '../core/models.js';
export declare class FreshteamProvider extends BaseProvider {
    readonly id = "freshteam";
    readonly name = "Freshteam";
    detect(entry: ProviderEntry): Promise<boolean>;
    fetch(entry: ProviderEntry, ctx: FetchContext): Promise<ProviderJob[]>;
    private getBaseUrl;
    private mapJob;
    private getSkillKeywords;
}
declare const _default: FreshteamProvider;
export default _default;
//# sourceMappingURL=freshteam.d.ts.map