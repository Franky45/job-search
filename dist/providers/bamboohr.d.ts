/**
 * BambooHR provider - Popular SME ATS
 */
import { BaseProvider } from './base.js';
import { ProviderEntry, ProviderJob, FetchContext } from '../core/models.js';
export declare class BambooHRProvider extends BaseProvider {
    readonly id = "bamboohr";
    readonly name = "BambooHR";
    detect(entry: ProviderEntry): Promise<boolean>;
    fetch(entry: ProviderEntry, ctx: FetchContext): Promise<ProviderJob[]>;
    private getBaseUrl;
    private mapJob;
    private getSkillKeywords;
}
declare const _default: BambooHRProvider;
export default _default;
//# sourceMappingURL=bamboohr.d.ts.map