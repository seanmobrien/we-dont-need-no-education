import { parsePaginationStats } from '@/lib/components/mui/data-grid/queryHelpers/utility';
import { buildDrizzleQueryFilter } from './buildDrizzleFilter';
import { buildDrizzleOrderBy } from './buildDrizzleOrderBy';
import { buildDrizzlePagination } from './buildDrizzlePagination';
import { drizDb } from '@compliance-theater/database/orm';
export const countQueryFactory = (select) => {
    const db = drizDb();
    const subQ = select.as('app_subq_count');
    return {
        select: db.select().from(subQ),
        count: db.$count(subQ),
    };
};
export async function selectForGrid({ req, query, getColumn, columnMap = {}, recordMapper, defaultSort, }) {
    const paginationStats = parsePaginationStats(new URL(req.url));
    const filteredQuery = buildDrizzleQueryFilter({
        query,
        source: req,
        getColumn,
        columnMap,
    });
    const sortedQuery = buildDrizzleOrderBy({
        query: filteredQuery,
        source: req,
        getColumn,
        columnMap,
        defaultSort,
    });
    const { select, count } = countQueryFactory(sortedQuery);
    const paginatedQuery = buildDrizzlePagination({
        query: select,
        req,
    });
    const [results, totalCount] = await Promise.all([
        typeof paginatedQuery === 'function' ? paginatedQuery() : paginatedQuery,
        count,
    ]);
    const transformedResults = recordMapper
        ? results.map(recordMapper)
        : results;
    return {
        results: transformedResults,
        pageStats: {
            page: paginationStats.page,
            num: paginationStats.num,
            total: totalCount,
        },
    };
}
//# sourceMappingURL=selectForGrid.js.map