/**
 * Oracle Cloud / Taleo provider - Enterprise ATS
 */
import { BaseProvider } from './base.js';
import { ProviderEntry, ProviderJob, FetchContext } from '../core/models.js';
export declare class OracleCloudProvider extends BaseProvider {
    readonly id = "oraclecloud";
    readonly name = "Oracle Cloud / Taleo";
    detect(entry: ProviderEntry): Promise<boolean>;
    fetch(entry: ProviderEntry, ctx: FetchContext): Promise<ProviderJob[]>;
    private getBaseUrl;
    private parseRss;
}
declare const _default: OracleCloudProvider;
export default _default;
//# sourceMappingURL=oracle.d.ts.map