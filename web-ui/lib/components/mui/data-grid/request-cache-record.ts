import { PaginatedResultset } from '@/data-models';
import { LoggedError } from '@/lib/react-util';
import {
  GridFilterModel,
  GridGetRowsResponse,
  GridLogicOperator,
  GridSortModel,
  GridValidRowModel,
} from '@mui/x-data-grid-pro';
import { GetRequestCacheRecordProps } from './types';
import { env } from '@/lib/site-util/env';
export class RequestCacheRecord<TModel extends GridValidRowModel = object> {
  static #globalCache: Map<string, RequestCacheRecord> = new Map<
    string,
    RequestCacheRecord
  >();

  static #buildKey(
    url: string,
    page: number,
    pageSize: number,
    sort = [] as GridSortModel,
    {
      items: filterItems = [],
      logicOperator: filterLogicOperator = GridLogicOperator.And,
      quickFilterValues: filterQuickFilterValues = [],
      quickFilterLogicOperator:
        filterQuickFilterLogicOperator = GridLogicOperator.And,
      quickFilterExcludeHiddenColumns:
        filterQuickFilterExcludeHiddenColumns = true,
    }: GridFilterModel = {} as GridFilterModel,
  ): string {
    const urlWithParams = new URL(url);
    urlWithParams.searchParams.set('num', pageSize.toString());
    urlWithParams.searchParams.set('page', (page + 1).toString()); // API is 1-based, DataGrid is 0-based
    if (sort.length > 0) {
      urlWithParams.searchParams.set(
        'sort',
        sort.map((s) => `${s.field}:${s.sort ?? 'asc'}`).join(','),
      );
    }
    if (filterItems.length > 0 || filterQuickFilterValues.length > 0) {
      urlWithParams.searchParams.set(
        'filter',
        JSON.stringify({
          items: filterItems,
          logicOperator: filterLogicOperator,
          quickFilterValues: filterQuickFilterValues,
          quickFilterLogicOperator: filterQuickFilterLogicOperator,
          quickFilterExcludeHiddenColumns:
            filterQuickFilterExcludeHiddenColumns,
        }),
      );
    }
    return urlWithParams.toString();
  }
  static get({
    url,
    page,
    pageSize,
    sort = [] as GridSortModel,
    filter,
    getRecordData,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    setIsLoading,
  }: GetRequestCacheRecordProps): Promise<GridGetRowsResponse> {
    console.log('RequestCacheRecord.get');
    const key = RequestCacheRecord.#buildKey(url, page, pageSize, sort, filter);
    let record: RequestCacheRecord | undefined =
      RequestCacheRecord.#globalCache.get(key);
    if (!record) {
      // setIsLoading((v) => (v ? v : true));

      const response: Promise<Response> = getRecordData
        ? getRecordData({
            url,
            page,
            pageSize,
            filter,
            sort,
          })
        : fetch(key);
      record = new RequestCacheRecord(
        url,
        page,
        pageSize,
        sort,
        filter ?? ({} as GridFilterModel),
        response,
      );
    }
    return record.chain();
  }

  readonly #page: number;
  readonly #pageSize: number;
  readonly #sort: GridSortModel;
  readonly #filter: GridFilterModel;
  readonly #url: string;
  #resolveTo: Promise<GridGetRowsResponse>;

  private constructor(
    url: string,
    page: number,
    pageSize: number,
    sort: GridSortModel,
    filter: GridFilterModel,
    request: Promise<Response>,
  ) {
    this.#url = url;
    this.#page = page;
    this.#pageSize = pageSize;
    this.#sort = sort;
    this.#filter = filter;
    this.#resolveTo = new Promise(async (resolve, reject) => {
      try {
        const resolvedRequest = await request;
        const processedResult = await this.#onRequestResolved(resolvedRequest);
        try {
          resolve(processedResult);
        } finally {
          setTimeout(() => {
            RequestCacheRecord.#globalCache.delete(this.key);
          }, env('NEXT_PUBLIC_DATAGRID_CLIENT_CACHE_TIMEOUT'));
        }
      } catch (error) {
        RequestCacheRecord.#globalCache.delete(this.key);
        const le = LoggedError.isTurtlesAllTheWayDownBaby(error, {
          log: true,
          source: 'grid::get',
        });
        reject(le);
      }
    });
  }

  get key(): string {
    return RequestCacheRecord.#buildKey(
      this.#url,
      this.#page,
      this.#pageSize,
      this.#sort,
      this.#filter,
    );
  }
  get page(): number {
    return this.#page;
  }
  get pageSize(): number {
    return this.#pageSize;
  }
  chain(): Promise<GridGetRowsResponse> {
    this.#resolveTo = this.#resolveTo.then((x) => x);
    return this.#resolveTo;
  }

  async #onRequestResolved(response: Response): Promise<GridGetRowsResponse> {
    if (!response.ok) {
      throw new Error(`Request failed with status: ${response.status}`);
    }
    const data = (await response.json()) as PaginatedResultset<TModel>;
    const rowCount = data.pageStats?.total ?? 0;
    return {
      rows: data.results.map((item: TModel) => ({
        ...item,
      })),
      rowCount,
    };
  }
}
