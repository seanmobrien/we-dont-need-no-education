import { UrlBuilder } from 'lib/site-util/url-builder/_impl';
import { siteMap } from 'lib/site-util/url-builder/_sitemap';
import { mappedUrlBuilderFactory } from 'lib/site-util/url-builder/_from-map';

describe('UrlBuilder', () => {
  const hostname = 'http://test-run.localhost';

  it('should create root URL', () => {
    const rootUrl = UrlBuilder.root;
    expect(rootUrl.toString()).toBe(`${hostname}/`);
  });

  it('should create child URL', () => {
    const rootBuilder = UrlBuilder.rootBuilder;
    const childBuilder = rootBuilder.child('child-segment', 'child-slug');
    expect(childBuilder.url.toString()).toBe(
      `${hostname}/child-segment/child-slug`
    );
  });

  it('should create page URL', () => {
    const rootBuilder = UrlBuilder.rootBuilder;
    const pageUrl = rootBuilder.page('page', 'page-slug');
    expect(pageUrl.toString()).toBe(`${hostname}/page/page-slug`);
  });

  it('should create a sitemap bulder', () => {
    const target = mappedUrlBuilderFactory(siteMap);
    expect(target).not.toBeNull();
    const bulkEdit = target.email.bulkEdit();
    expect(bulkEdit.toString()).toBe(`${hostname}/email/bulk-edit`);
  });
});
