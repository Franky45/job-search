/**
 * iCIMS provider - Enterprise ATS
 */
import { BaseProvider } from './base.js';
import { ProviderEntry, ProviderJob, FetchContext } from '../core/models.js';
export declare class IcimsProvider extends BaseProvider {
    readonly id = "icims";
    readonly name = "iCIMS";
    detect(entry: ProviderEntry): Promise<boolean>;
    fetch(entry: ProviderEntry, ctx: FetchContext): Promise<ProviderJob[]>;
    private getBaseUrl;
    private mapJob;
    private getSkillKeywords;
}
declare const _default: IcimsProvider;
export default _default;
//# sourceMappingURL=icims.d.ts.map