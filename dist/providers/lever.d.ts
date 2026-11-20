/**
 * Lever provider - Popular ATS for tech companies
 */
import { BaseProvider } from './base.js';
import { ProviderEntry, ProviderJob, FetchContext } from '../core/models.js';
export declare class LeverProvider extends BaseProvider {
    readonly id = "lever";
    readonly name = "Lever";
    detect(entry: ProviderEntry): Promise<boolean>;
    fetch(entry: ProviderEntry, ctx: FetchContext): Promise<ProviderJob[]>;
    private extractBoardToken;
    private mapPosting;
    private getSkillKeywords;
}
declare const _default: LeverProvider;
export default _default;
//# sourceMappingURL=lever.d.ts.map