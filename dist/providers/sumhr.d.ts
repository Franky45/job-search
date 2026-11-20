/**
 * SumHR provider - Indian HRMS
 * Used by: Indian SMEs
 */
import { BaseProvider } from './base.js';
import { ProviderEntry, ProviderJob, FetchContext } from '../core/models.js';
export declare class SumHRProvider extends BaseProvider {
    readonly id = "sumhr";
    readonly name = "SumHR";
    detect(entry: ProviderEntry): Promise<boolean>;
    fetch(entry: ProviderEntry, ctx: FetchContext): Promise<ProviderJob[]>;
    private getBaseUrl;
    private mapJob;
    private getSkillKeywords;
}
declare const _default: SumHRProvider;
export default _default;
//# sourceMappingURL=sumhr.d.ts.map