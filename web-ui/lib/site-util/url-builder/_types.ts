import { PickField } from 'lib/typescript';

export type IUrlBuilder = {
  get parent(): IUrlBuilder;
  get segment(): string;
  get slug(): string | undefined;
  get path(): string;
  get url(): URL;

  child: (segment: string, slug?: string) => IUrlBuilder;
  page: (page: string, slug?: string) => URL;

  toString: () => string;
};

export type UrlBuilderInfo = {
  readonly parent: IUrlBuilder;
  readonly segment: string;
  readonly slug?: string;
};

export type UrlMap = Record<string, string | Record<string, unknown>>;

export type MappedUrlBuilder<TMap> = {
  [K in keyof TMap | keyof IUrlBuilder]: K extends keyof IUrlBuilder
    ? PickField<IUrlBuilder, K>
    : K extends keyof TMap
    ? PickField<TMap, K> extends infer NestedMap
      ? NestedMap extends string
        ? (slug?: string) => URL
        : NestedMap extends Record<string, unknown>
        ? MappedUrlBuilder<NestedMap>
        : never
      : never
    : never;
};

/*
export const testMap: UrlMap = {
  api: {
    contact: '',
    email: {
      search: '',
      thread: 'threadId',
    },
  },
  email: {
    bulkEdit: '',
    edit: '',
  },
};

export const check: MappedUrlBuilder<typeof testMap> = {};
check.api.ci
*/
