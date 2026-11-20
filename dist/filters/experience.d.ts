/**
 * Experience filter - parses years requirements from job descriptions
 */
export interface ExperienceRequirement {
    min?: number;
    max?: number;
    raw?: string;
}
export declare function extractExperience(text: string): ExperienceRequirement | null;
export interface ExperienceFilterConfig {
    maxYears?: number;
    stretchYears?: number;
}
export declare function buildExperienceFilter(config: ExperienceFilterConfig): (jobExp: ExperienceRequirement | null) => boolean;
export declare function getExperienceLabel(jobExp: ExperienceRequirement | null): string;
//# sourceMappingURL=experience.d.ts.map