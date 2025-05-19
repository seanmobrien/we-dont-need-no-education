import { PaginatedResultset } from '@/data-models';
import { LoggedError } from '@/lib/react-util';
import { GridGetRowsResponse, GridValidRowModel } from '@mui/x-data-grid';
import { GetRequestCacheRecordProps } from './types';

export class RequestCacheRecord<TModel extends GridValidRowModel = object> {
  static #globalCache: Map<string, RequestCacheRecord> = new Map<
    string,
    RequestCacheRecord
  >();

  static #buildKey(url: string, page: number, pageSize: number): string {
    return `${url}-${page}-${pageSize}`;
  }
  static get({
    url,
    page,
    pageSize,
    getRecordData,
    setIsLoading,
  }: GetRequestCacheRecordProps): Promise<GridGetRowsResponse> {
    const key = RequestCacheRecord.#buildKey(url, page, pageSize);
    let record: RequestCacheRecord | undefined =
      RequestCacheRecord.#globalCache.get(key);
    if (!record) {
      setIsLoading((v) => (v ? v : true));

      const urlWithParams = new URL(url);
      urlWithParams.searchParams.set('num', pageSize.toString());
      urlWithParams.searchParams.set('page', (page + 1).toString()); // API is 1-based, DataGrid is 0-based

      record = new RequestCacheRecord(
        url,
        page,
        pageSize,
        RequestCacheRecord.#requestData(
          urlWithParams.toString(),
          getRecordData,
        ),
      );
    }
    return record.chain();
  }

  static #requestData(
    url: string,
    getRecordData?: (url: string) => Promise<Response>,
  ): Promise<Response> {
    const req = getRecordData ?? fetch;
    return req(url);
  }

  readonly #page: number;
  readonly #pageSize: number;
  readonly #url: string;
  #resolveTo: Promise<GridGetRowsResponse>;

  private constructor(
    url: string,
    page: number,
    pageSize: number,
    request: Promise<Response>,
  ) {
    this.#url = url;
    this.#page = page;
    this.#pageSize = pageSize;
    this.#resolveTo = new Promise(async (resolve, reject) => {
      try {
        const resolvedRequest = await request;
        const processedResult = await this.#onRequestResolved(resolvedRequest);
        try {
          resolve(processedResult);
        } finally {
          setTimeout(
            () => {
              RequestCacheRecord.#globalCache.delete(this.key);
            },
            2 * 60 * 1000,
          );
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
    return RequestCacheRecord.#buildKey(this.#url, this.#page, this.#pageSize);
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
