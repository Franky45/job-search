/**
 * ADP provider - Enterprise payroll/ATS
 */
import { BaseProvider } from './base.js';
import { ProviderEntry, ProviderJob, FetchContext } from '../core/models.js';
export declare class AdpProvider extends BaseProvider {
    readonly id = "adp";
    readonly name = "ADP";
    detect(entry: ProviderEntry): Promise<boolean>;
    fetch(entry: ProviderEntry, ctx: FetchContext): Promise<ProviderJob[]>;
    private getBaseUrl;
    private mapJob;
    private getSkillKeywords;
}
declare const _default: AdpProvider;
export default _default;
//# sourceMappingURL=adp.d.ts.map