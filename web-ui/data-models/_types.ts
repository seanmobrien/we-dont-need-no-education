export type PaginationStats = {
  page: number;
  num: number;
  total: number;
};

export type PaginatedResultset<T> = {
  results: ReadonlyArray<T>;
  pageStats: PaginationStats;
};
