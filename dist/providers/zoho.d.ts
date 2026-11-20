/**
 * Zoho Recruit provider - Leading global/Indian ATS
 * Used by: 50,000+ organizations
 */
import { BaseProvider } from './base.js';
import { ProviderEntry, ProviderJob, FetchContext } from '../core/models.js';
export declare class ZohoRecruitProvider extends BaseProvider {
    readonly id = "zoho-recruit";
    readonly name = "Zoho Recruit";
    detect(entry: ProviderEntry): Promise<boolean>;
    fetch(entry: ProviderEntry, ctx: FetchContext): Promise<ProviderJob[]>;
    private fetchFromHtml;
    private getBaseUrl;
    private extractDigest;
    private mapJob;
    private getSkillKeywords;
}
declare const _default: ZohoRecruitProvider;
export default _default;
//# sourceMappingURL=zoho.d.ts.map