/**
 * Jobvite provider - Enterprise ATS
 */
import { BaseProvider } from './base.js';
import { ProviderEntry, ProviderJob, FetchContext } from '../core/models.js';
export declare class JobviteProvider extends BaseProvider {
    readonly id = "jobvite";
    readonly name = "Jobvite";
    detect(entry: ProviderEntry): Promise<boolean>;
    fetch(entry: ProviderEntry, ctx: FetchContext): Promise<ProviderJob[]>;
    private getBaseUrl;
    private mapJob;
    private getSkillKeywords;
}
declare const _default: JobviteProvider;
export default _default;
//# sourceMappingURL=jobvite.d.ts.map