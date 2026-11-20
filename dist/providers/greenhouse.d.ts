/**
 * Greenhouse provider - Popular global ATS
 */
import { BaseProvider } from './base.js';
import { ProviderEntry, ProviderJob, FetchContext } from '../core/models.js';
export declare class GreenhouseProvider extends BaseProvider {
    readonly id = "greenhouse";
    readonly name = "Greenhouse";
    detect(entry: ProviderEntry): Promise<boolean>;
    fetch(entry: ProviderEntry, ctx: FetchContext): Promise<ProviderJob[]>;
    private fetchFromBoard;
    private extractBoardToken;
    private mapJob;
    private getSkillKeywords;
}
declare const _default: GreenhouseProvider;
export default _default;
//# sourceMappingURL=greenhouse.d.ts.map