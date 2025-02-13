import { IUrlBuilder, UrlBuilderInfo } from './_types';
import { env } from 'lib/site-util/env';

export class UrlBuilder implements IUrlBuilder {
  static get root() {
    return new URL('/', env('NEXT_PUBLIC_HOSTNAME'));
  }
  static get rootBuilder() {
    return new UrlBuilder({
      parent: null as unknown as IUrlBuilder,
      segment: '',
    });
  }
  static buildSlugPart = (slug?: string) => (!slug ? '' : `/${slug}`);

  private readonly info: UrlBuilderInfo;

  constructor(info: UrlBuilderInfo | { parent: null; segment: '' }) {
    if (
      !info ||
      typeof info !== 'object' ||
      !('segment' in info && 'parent' in info)
    ) {
      throw new TypeError(
        `invalid or missing info object provided: ${JSON.stringify(
          info ?? 'null'
        )}`
      );
    }
    this.info = info as UrlBuilderInfo;
  }

  private get parentPart() {
    return this.info.parent == null ? '' : this.info.parent.path;
  }
  private get slugPart() {
    return UrlBuilder.buildSlugPart(this.info.slug);
  }

  get parent() {
    return this.info.parent;
  }
  get segment() {
    return this.info.segment;
  }
  get slug() {
    return this.info.slug;
  }
  get path() {
    const p = `${this.parentPart}/${this.info.segment}${this.slugPart}`;
    return p.endsWith('/') ? p.slice(0, -1) : p;
  }
  get url() {
    return new URL(this.path, UrlBuilder.root);
  }

  toString() {
    return this.path;
  }

  child(segment: string, slug?: string) {
    return new UrlBuilder({ parent: this, segment, slug });
  }

  page(page: string, slug?: string) {
    return new URL(
      `${this.path}/${page}${UrlBuilder.buildSlugPart(slug)}`,
      UrlBuilder.root
    );
  }
}
