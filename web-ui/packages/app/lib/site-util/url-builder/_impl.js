import { mappedPageOverloadFactory } from './_from-map';
import { env } from '@compliance-theater/env';
const appendParams = (url, params) => {
    if (!params) {
        return url;
    }
    const copy = new URL(url);
    if (params) {
        const serializeParam = (q, key, value) => {
            if (typeof value !== 'number' && !value) {
                return;
            }
            if (Array.isArray(value)) {
                value.forEach((v) => serializeParam(q, key, v));
            }
            else if (typeof value === 'object') {
                q.append(key, JSON.stringify(value));
            }
            else {
                q.append(key, String(value));
            }
        };
        copy.search = Object.keys(params)
            .reduce((q, key) => {
            const value = params[key];
            serializeParam(q, key, value);
            return q;
        }, copy.searchParams ?? new URLSearchParams())
            .toString();
    }
    return copy;
};
export class UrlBuilder {
    static get root() {
        return new URL('/', env('NEXT_PUBLIC_HOSTNAME'));
    }
    static get rootBuilder() {
        return new UrlBuilder({
            parent: null,
            segment: '',
        });
    }
    static buildSlugPart = (slug) => typeof slug !== 'number' && !slug ? '' : `/${slug}`;
    info;
    constructor(info) {
        if (!info ||
            typeof info !== 'object' ||
            !('segment' in info && 'parent' in info)) {
            throw new TypeError(`invalid or missing info object provided: ${JSON.stringify(info ?? 'null')}`);
        }
        this.info = info;
        this.route = mappedPageOverloadFactory(this, this.info.segment);
    }
    get parentPart() {
        return this.info.parent == null ? '' : this.info.parent.path;
    }
    route;
    get slugPart() {
        return UrlBuilder.buildSlugPart(this.info.slug);
    }
    get urlWithSlash() {
        return new URL(`${this.path}/`, UrlBuilder.root);
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
    child(segment, slug) {
        return new UrlBuilder({ parent: this, segment, slug });
    }
    page(page, slug, params) {
        if (typeof page === 'undefined') {
            return this.url;
        }
        if (typeof page === 'object') {
            return appendParams(this.url, page);
        }
        const normalizedPage = String(page);
        if (normalizedPage.indexOf('/') > -1) {
            throw new Error('Invalid page name.');
        }
        if (typeof slug === 'undefined') {
            return new URL(normalizedPage, this.urlWithSlash);
        }
        if (typeof slug === 'object') {
            return appendParams(new URL(normalizedPage, this.urlWithSlash), slug);
        }
        if (typeof slug === 'string' && slug.indexOf('/') > -1) {
            throw new Error('Invalid slug name.');
        }
        const urlPart = new URL(`${normalizedPage}/${slug}`, this.urlWithSlash);
        return typeof params === 'undefined'
            ? urlPart
            : appendParams(urlPart, params);
    }
}
//# sourceMappingURL=_impl.js.map