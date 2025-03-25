import { IUrlBuilder, MappedPageOverloads } from './_types';
import { UrlBuilder } from './_impl';

/**
 * Factory function to create a MappedPageOverloads function.
 *
 * @param builder - The URL builder instance.
 * @param page - The page name.
 * @returns A function that generates URLs based on the provided slug and params.
 */
const mappedPageOverloadFactory = (
  builder: IUrlBuilder,
  page: string,
): MappedPageOverloads => {
  const ret: MappedPageOverloads = (
    slug?: string | number | object,
    params?: object,
  ) => {
    if (typeof slug === 'object') {
      return builder.page(page, slug);
    } else if (typeof slug === 'string' || typeof slug === 'number') {
      return builder.page(page, slug, params);
    } else {
      return builder.page(page, params);
    }
  };
  return ret;
};

let siteBuilderRoot = new UrlBuilder({ parent: null, segment: '' });

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const mappedUrlBuilderFactory = (_arg: unknown) => {
  if ('api' in siteBuilderRoot) {
    return siteBuilderRoot;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ret = new UrlBuilder({ parent: null, segment: '' }) as any;
  ret.api = ret.child('api');
  ret.api.contact = mappedPageOverloadFactory(ret.api, 'contact');
  ret.api.email = ret.api.child('email');
  ret.api.email.search = mappedPageOverloadFactory(ret.api, 'search');
  ret.api.email.thread = mappedPageOverloadFactory(ret.api, 'thread');
  ret.api.email.stats = mappedPageOverloadFactory(ret.api, 'stats');
  ret.api.email.import = ret.api.email.child('import');
  ret.api.email.import.google = ret.api.email.import.child('google');
  ret.api.email.import.google.message =
    ret.api.email.import.google.child('message');
  ret.api.email.import.google.message.status = mappedPageOverloadFactory(
    ret.api.email.import.google.message,
    'status',
  );
  ret.api.email.import.google.search = mappedPageOverloadFactory(
    ret.api.email.import.google,
    'search',
  );
  ret.api.email.import.list = mappedPageOverloadFactory(
    ret.api.email.import,
    'list',
  );
  ret.email = ret.child('email');
  ret.email.bulkEdit = mappedPageOverloadFactory(ret.email, 'bulk-edit');
  ret.email.edit = mappedPageOverloadFactory(ret.email, 'edit');

  siteBuilderRoot = ret;

  return ret;
};

/**
 * Factory function to create a MappedUrlBuilder based on a provided map.
 *
 * @typeParam TMap - The type of the map object.
 * @param map - The map object defining the URL structure.
 * @param builder - Optional URL builder instance. If not provided, a new UrlBuilder instance is created.
 * @returns A MappedUrlBuilder instance based on the provided map.
 * @throws {TypeError} If the map is not an object.
export const mappedUrlBuilderFactory = <TMap>(
  map: TMap,
  builder?: IUrlBuilder
): MappedUrlBuilder<typeof map> => {
  if (!map || typeof map !== 'object') {
    throw new TypeError('map must be an object');
  }
  const retBuilder: Record<string, unknown> & IUrlBuilder = (builder ??
    new UrlBuilder({ parent: null, segment: '' })) as MappedUrlBuilder<TMap>;
  Object.keys(map).forEach((key) => {
    const value = map[key as keyof TMap];
    // If we are working with a string, we are at the end of the chain
    if (typeof value === 'string') {
      // If the string value is empty, the use the property key as the page name
      // Otherwise use the value as the page name
      retBuilder[key] = mappedPageOverloadFactory(
        retBuilder,
        value.length === 0 ? key : value
      );
    } else if (typeof value === 'object' && value !== null) {
      // Otherwise recuresively build the child object
      retBuilder[key] = mappedUrlBuilderFactory<typeof value>(
        value,
        retBuilder.child(key)
      );
    }
  });

  return retBuilder as MappedUrlBuilder<typeof map>;
};
 */
