export type PaginationStats<TPage = number> = {
  page: TPage;
  num: number;
  total: number;
};

export type PaginatedResultset<T, TPage = number> = {
  results: ReadonlyArray<T>;
  pageStats: PaginationStats<TPage>;
};
