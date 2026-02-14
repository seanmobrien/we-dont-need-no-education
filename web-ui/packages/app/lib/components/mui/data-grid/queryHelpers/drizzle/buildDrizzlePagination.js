import { parsePaginationStats as parsePaginationStatsImpl } from '../utility';
import { deprecate } from '@/lib/nextjs-util/utils';
export const parsePaginationStats = deprecate((req) => parsePaginationStatsImpl(req), "DP0010 - parsePaginationStats.  Import from '@/lib/components/mui/data-grid/queryHelpers/utility instead.");
export const buildDrizzlePagination = ({ query, req, }) => {
    const { num, offset } = parsePaginationStatsImpl(req);
    return query.offset(offset).limit(num);
};
//# sourceMappingURL=buildDrizzlePagination.js.map