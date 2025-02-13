import { IUrlBuilder, MappedUrlBuilder } from './_types';
import { UrlBuilder } from './_impl';

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
      if (value.length === 0) {
        // If the string value is empty, the use the property key as the page name
        retBuilder[key] = (slug?: string) => retBuilder.page(key, slug);
      } else {
        // Otherwise the value contains the actual page name - this is to simplify accessing pages like 'bulk-edit'
        retBuilder[key] = (slug?: string) => retBuilder.page(value, slug);
      }
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
/*
export const siteBuilder = mappedUrlBuilderFactory({
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
});
siteBuilder.api.email.thread('123');
*/
