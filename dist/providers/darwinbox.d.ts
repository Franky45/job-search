/**
 * Darwinbox provider - Major Indian HRMS/ATS
 * Used by: Tata, Mahindra, Aditya Birla, Godrej, 800+ companies
 */
import { BaseProvider } from './base.js';
import { ProviderEntry, ProviderJob, FetchContext } from '../core/models.js';
export declare class DarwinboxProvider extends BaseProvider {
    readonly id = "darwinbox";
    readonly name = "Darwinbox";
    detect(entry: ProviderEntry): Promise<boolean>;
    fetch(entry: ProviderEntry, ctx: FetchContext): Promise<ProviderJob[]>;
    private fetchAlternative;
    private getBaseUrl;
    private mapJob;
    private mapGraphQLJob;
    private formatLocation;
    private getSkillKeywords;
}
declare const _default: DarwinboxProvider;
export default _default;
//# sourceMappingURL=darwinbox.d.ts.map