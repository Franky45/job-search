/**
 * PeopleStrong provider - Major Indian HRMS/ATS
 * Used by: Large Indian enterprises
 */
import { BaseProvider } from './base.js';
import { ProviderEntry, ProviderJob, FetchContext } from '../core/models.js';
export declare class PeopleStrongProvider extends BaseProvider {
    readonly id = "peoplestrong";
    readonly name = "PeopleStrong";
    detect(entry: ProviderEntry): Promise<boolean>;
    fetch(entry: ProviderEntry, ctx: FetchContext): Promise<ProviderJob[]>;
    private fetchFromHtml;
    private getBaseUrl;
    private extractJsonLd;
    private mapJob;
    private mapJsonLdJob;
    private getSkillKeywords;
}
declare const _default: PeopleStrongProvider;
export default _default;
//# sourceMappingURL=peoplestrong.d.ts.map