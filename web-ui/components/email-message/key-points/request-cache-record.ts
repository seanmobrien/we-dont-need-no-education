import { KeyPointsDetails, PaginatedResultset } from '@/data-models';
import { LoggedError } from '@/lib/react-util';
import { GridGetRowsResponse } from '@mui/x-data-grid';

export class RequestCacheRecord {
  static #globalCache: Map<string, RequestCacheRecord> = new Map<
    string,
    RequestCacheRecord
  >();

  readonly #page: number;
  readonly #perPage: number;
  readonly #emailId: string;
  readonly #request: Promise<Response>;
  #resolveTo: Promise<GridGetRowsResponse>;
  constructor(
    emailId: string,
    page: number,
    perPage: number,
    request: Promise<Response>,
  ) {
    this.#emailId = emailId;
    this.#page = page;
    this.#perPage = perPage;
    this.#request = request;
    this.#resolveTo = new Promise(async (resolve, reject) => {
      try {
        const result = await request
          .then(this.#onRequestResolved.bind(this))
          .finally(() => {
            setTimeout(
              () => {
                RequestCacheRecord.#globalCache.delete(this.key);
              },
              2 * 60 * 1000,
            );
          });
        resolve(result);
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
    return `${this.#emailId}-${this.#page}-${this.#perPage}`;
  }
  get page(): number {
    return this.#page;
  }
  get perPage(): number {
    return this.#perPage;
  }
  chain(): Promise<GridGetRowsResponse> {
    this.#resolveTo = this.#resolveTo.then((x) => x);
    return this.#resolveTo;
  }

  #onRequestResolved(response: Response): Promise<GridGetRowsResponse> {
    if (!response.ok) {
      throw new Error(`Request failed with status: ${response.status}`);
    }
    return response
      .json()
      .then((data: PaginatedResultset<KeyPointsDetails>) => {
        const rowCount = data.pageStats?.total ?? 0;
        return {
          rows: data.results.map((item: KeyPointsDetails) => ({
            ...item,
          })),
          rowCount,
        };
      });
  }

  static get(
    emailId: string,
    page: number,
    perPage: number,
    action: () => Promise<Response>,
  ): Promise<GridGetRowsResponse> {
    const key = `${emailId}-${page}-${perPage}`;
    let record: RequestCacheRecord | undefined = this.#globalCache.get(key);
    if (!record) {
      record = new RequestCacheRecord(emailId, page, perPage, action());
      this.#globalCache.set(key, record);
    }
    return record.chain();
  }
}
