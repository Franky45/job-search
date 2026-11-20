/**
 * Title filter - positive/negative keywords with word/stem matching
 */
import { TitleFilter } from '../core/models.js';
export declare function buildTitleFilter(titleFilter: TitleFilter): (title: string) => boolean;
export declare function getMatchedPositiveKeywords(title: string, titleFilter: TitleFilter): string[];
//# sourceMappingURL=title.d.ts.map