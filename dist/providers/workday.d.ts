/**
 * Workday provider - Enterprise ATS
 */
import { BaseProvider } from './base.js';
import { ProviderEntry, ProviderJob, FetchContext } from '../core/models.js';
export declare class WorkdayProvider extends BaseProvider {
    readonly id = "workday";
    readonly name = "Workday";
    detect(entry: ProviderEntry): Promise<boolean>;
    fetch(entry: ProviderEntry, ctx: FetchContext): Promise<ProviderJob[]>;
    private extractTenant;
    private mapPosting;
    private getSkillKeywords;
}
declare const _default: WorkdayProvider;
export default _default;
//# sourceMappingURL=workday.d.ts.map