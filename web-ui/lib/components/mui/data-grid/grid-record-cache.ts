import { PaginatedResultset } from '@/data-models';
import { isAbortError, LoggedError } from '@/lib/react-util';
import {
  GridFilterModel,
  GridGetRowsResponse,
  GridLogicOperator,
  GridSortModel,
  GridValidRowModel,
} from '@mui/x-data-grid-pro';
import { GetRequestCacheRecordProps, RequestCacheRecordProps } from './types';
import { log } from '@/lib/logger';

/**
 * A cache manager for paginated, sorted, and filtered data grid records.
 *
 * `GridRecordCache` provides a static, in-memory cache for data grid requests, keyed by request parameters
 * such as URL, page, page size, sort, and filter. It ensures that repeated requests for the same data
 * are served from cache, reducing redundant network calls. The cache is automatically invalidated after
 * a configurable timeout or on explicit invalidation.
 *
 * @typeParam TModel - The type of the row model, extending `GridValidRowModel`.
 *
 * @example
 * ```typescript
 * const response = await GridRecordCache.getWithFetch({
 *   url: '/api/data',
 *   page: 0,
 *   pageSize: 25,
 *   sort: [{ field: 'name', sort: 'asc' }],
 *   filter: { items: [], logicOperator: GridLogicOperator.And },
 *   getRecordData: customFetchFunction,
 * });
 * ```
 *
 * @remarks
 * - The cache key is built from the request parameters, including URL, page, page size, sort, and filter.
 * - The cache is global and static, shared across all instances.
 * - The cache entry is automatically removed after a timeout specified by `NEXT_PUBLIC_DATAGRID_CLIENT_CACHE_TIMEOUT`.
 * - Use `invalidate` to manually remove a cache entry.
 * - Use `peek` to check for a cached response without triggering a fetch.
 *
 * @see {@link GridRecordCache.getWithFetch}
 * @see {@link GridRecordCache.invalidate}
 * @see {@link GridRecordCache.peek}
 */
export class GridRecordCache<TModel extends GridValidRowModel = object> {
  static #globalCache: Map<string, GridRecordCache> = new Map<
    string,
    GridRecordCache
  >();
  /**
   * Builds a unique cache key string for a data grid request based on the provided request properties.
   *
   * The key is constructed by serializing the URL with query parameters representing pagination,
   * sorting, and filtering options. This ensures that each unique combination of these parameters
   * generates a distinct cache key.
   *
   * @param props - The properties describing the request, including:
   *   - `url`: The base URL for the request.
   *   - `page`: The zero-based page index from the DataGrid.
   *   - `pageSize`: The number of items per page.
   *   - `sort`: An array of sorting options, each with a field and direction.
   *   - `filter`: An object describing filter options, including filter items, quick filter values,
   *     logic operator, and any additional quick filter properties.
   *
   * @returns A string representing the unique cache key for the given request parameters.
   */
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

  /**
   * Invalidates a cache record in the global cache.
   *
   * If a string key is provided, it checks if the key exists in the global cache.
   * If found, it logs the invalidation, deletes the cache entry, and returns `true`.
   * If the key does not exist, returns `false`.
   *
   * If a `RequestCacheRecordProps` object is provided, it builds the cache key from the object
   * and recursively calls `invalidate` with the generated key.
   *
   * @param input - The cache key as a string or a `RequestCacheRecordProps` object to identify the cache record.
   * @returns `true` if the cache record was found and invalidated; otherwise, `false`.
   */
  static invalidate(input: RequestCacheRecordProps | string): boolean {
    if (typeof input === 'string') {
      if (GridRecordCache.#globalCache.has(input)) {
        log((l) => l.info(`RequestCacheRecord.invalidate`, input));
        GridRecordCache.#globalCache.delete(input);
        return true;
      }
      return false;
    }
    return input ? GridRecordCache.invalidate(this.#buildKey(input)) : false;
  }
  /**
   * Retrieves a cached `GridRecordCache` instance for the given properties without modifying the cache.
   *
   * @param props - The properties used to identify the cache record.
   * @returns A cloned instance of the cached `GridRecordCache` if found; otherwise, `undefined`.
   */
  static peek(props: RequestCacheRecordProps) {
    log((l) => l.silly(`RequestCacheRecord.peek`, props));
    const key = GridRecordCache.#buildKey(props);
    const record: GridRecordCache | undefined =
      GridRecordCache.#globalCache.get(key);
    return record ? record.chain() : undefined;
  }

  /**
   * Retrieves a cached grid record or fetches new data if not present in the cache.
   *
   * This static method attempts to retrieve a `GridRecordCache` instance from the global cache
   * using a generated key based on the provided properties. If the record is not found,
   * it initiates a fetch operation using the `getRecordData` function or a default fetch call.
   * The resulting promise is wrapped in a `GridRecordCache` instance and returned via the `chain` method.
   *
   * @param getRecordData - Optional function to fetch record data. If not provided, a default fetch is used.
   * @param setIsLoading - Callback to set the loading state (currently unused).
   * @param props - Additional properties required to build the cache key and fetch data.
   * @returns A promise resolving to a `GridGetRowsResponse` containing the grid data.
   */
  static getWithFetch({
    getRecordData,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    setIsLoading,
    signal,
    ...props
  }: GetRequestCacheRecordProps): Promise<
    GridGetRowsResponse & { cancelled?: undefined | true }
  > {
    log((l) => l.silly(`RequestCacheRecord.getWithFetch`, props));
    const key = GridRecordCache.#buildKey(props);
    let record: GridRecordCache | undefined =
      GridRecordCache.#globalCache.get(key);
    if (!record) {
      const response: Promise<Response> = getRecordData
        ? getRecordData(props)
        : fetch(key, {
            signal,
          });
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
          setTimeout(
            () => {
              GridRecordCache.#globalCache.delete(this.key);
            },
            5 * 60 * 1000,
          ); // Default cache timeout of 5 minutes
        }
      } catch (error) {
        if (isAbortError(error)) {
          log((l) =>
            l.silly(
              `RequestCacheRecord.getWithFetch`,
              'Request aborted before it completed',
            ),
          );
          // If request was aborted we will want to re-load next time we're called with this key...
          GridRecordCache.#globalCache.delete(this.key);
          return;
        }
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
