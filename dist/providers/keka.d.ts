/**
 * Keka provider - Popular Indian HR/ATS for SMEs and startups
 * Used by: 10,000+ companies in India
 */
import { BaseProvider } from './base.js';
import { ProviderEntry, ProviderJob, FetchContext } from '../core/models.js';
export declare class KekaProvider extends BaseProvider {
    readonly id = "keka";
    readonly name = "Keka";
    detect(entry: ProviderEntry): Promise<boolean>;
    fetch(entry: ProviderEntry, ctx: FetchContext): Promise<ProviderJob[]>;
    private fetchAlternative;
    private getBaseUrl;
    private mapJob;
    private extractJsonLd;
    private mapJsonLdJob;
    private getSkillKeywords;
}
declare const _default: KekaProvider;
export default _default;
//# sourceMappingURL=keka.d.ts.map