/**
 * SuccessFactors (SAP) provider - Enterprise ATS
 */
import { BaseProvider } from './base.js';
import { ProviderEntry, ProviderJob, FetchContext } from '../core/models.js';
export declare class SuccessFactorsProvider extends BaseProvider {
    readonly id = "successfactors";
    readonly name = "SAP SuccessFactors";
    detect(entry: ProviderEntry): Promise<boolean>;
    fetch(entry: ProviderEntry, ctx: FetchContext): Promise<ProviderJob[]>;
    private getBaseUrl;
    private parseHtmlJobs;
}
declare const _default: SuccessFactorsProvider;
export default _default;
//# sourceMappingURL=successfactors.d.ts.map