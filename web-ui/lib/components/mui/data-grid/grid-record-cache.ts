import { PaginatedResultset } from '@/data-models';
import { LoggedError } from '@/lib/react-util';
import {
  GridFilterModel,
  GridGetRowsResponse,
  GridLogicOperator,
  GridSortModel,
  GridValidRowModel,
} from '@mui/x-data-grid-pro';
import { GetRequestCacheRecordProps, RequestCacheRecordProps } from './types';
import { env } from '@/lib/site-util/env';
import { log } from '@/lib/logger';

export class GridRecordCache<TModel extends GridValidRowModel = object> {
  static #globalCache: Map<string, GridRecordCache> = new Map<
    string,
    GridRecordCache
  >();
  static #buildKey({
    url,
    page,
    pageSize,
    sort = [],
    filter: {
      items: filterItems = [],
      quickFilterValues = [],
      logicOperator: filterLogicOperator = GridLogicOperator.And,
      ...quickFilterProps
    } = {} as GridFilterModel,
  }: RequestCacheRecordProps): string {
    const urlWithParams = new URL(url);
    urlWithParams.searchParams.set('num', pageSize.toString());
    urlWithParams.searchParams.set('page', (page + 1).toString()); // API is 1-based, DataGrid is 0-based
    if (sort.length > 0) {
      urlWithParams.searchParams.set(
        'sort',
        sort.map((s) => `${s.field}:${s.sort ?? 'asc'}`).join(','),
      );
    }
    if (filterItems.length > 0 || quickFilterValues.length > 0) {
      urlWithParams.searchParams.set(
        'filter',
        JSON.stringify({
          items: filterItems,
          logicOperator: filterLogicOperator,
          quickFilterValues: quickFilterValues,
          ...quickFilterProps,
        }),
      );
    }
    return urlWithParams.toString();
  }
  static peek(props: RequestCacheRecordProps) {
    log((l) => l.silly(`RequestCacheRecord.peek`, props));
    const key = GridRecordCache.#buildKey(props);
    const record: GridRecordCache | undefined =
      GridRecordCache.#globalCache.get(key);
    return record ? record.chain() : undefined;
  }
  static getWithFetch({
    getRecordData,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    setIsLoading,
    ...props
  }: GetRequestCacheRecordProps): Promise<GridGetRowsResponse> {
    log((l) => l.silly(`RequestCacheRecord.getWithFetch`, props));
    const key = GridRecordCache.#buildKey(props);
    let record: GridRecordCache | undefined =
      GridRecordCache.#globalCache.get(key);
    if (!record) {
      const response: Promise<Response> = getRecordData
        ? getRecordData(props)
        : fetch(key);
      record = new GridRecordCache(
        props.url,
        props.page,
        props.pageSize,
        props.sort ?? [],
        props.filter ?? ({} as GridFilterModel),
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
            GridRecordCache.#globalCache.delete(this.key);
          }, env('NEXT_PUBLIC_DATAGRID_CLIENT_CACHE_TIMEOUT'));
        }
      } catch (error) {
        GridRecordCache.#globalCache.delete(this.key);
        const le = LoggedError.isTurtlesAllTheWayDownBaby(error, {
          log: true,
          source: 'grid::get',
        });
        reject(le);
      }
    });
  }

  get key(): string {
    return GridRecordCache.#buildKey({
      url: this.#url,
      page: this.#page,
      pageSize: this.#pageSize,
      sort: this.#sort,
      filter: this.#filter,
    });
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
