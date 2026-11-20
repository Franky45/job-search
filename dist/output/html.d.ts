/**
 * HTML dashboard renderer using Eta template engine
 */
import { Job, ScanRun } from '../core/models.js';
export declare function renderDashboard(jobs: Job[], scanRuns: ScanRun[], meta: {
    generatedAt: string;
    totalJobs: number;
    filters?: any;
}): string;
//# sourceMappingURL=html.d.ts.map