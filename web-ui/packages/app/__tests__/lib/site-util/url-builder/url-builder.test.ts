jest.mock('@repo/lib-site-util-env');

import { UrlBuilder } from '@/lib/site-util/url-builder/_impl';
import { mappedUrlBuilderFactory } from '@/lib/site-util/url-builder/_from-map';
import { env } from '@repo/lib-site-util-env';

describe('UrlBuilder', () => {
  const hostname = 'http://test-run.localhost';

  beforeEach(() => {
    (env as jest.Mock).mockImplementation(() => hostname);
  });

  it('should create root URL', () => {
    const rootUrl = UrlBuilder.root;
    expect(rootUrl.toString()).toBe(`${hostname}/`);
  });

  it('should create child URL', () => {
    const rootBuilder = UrlBuilder.rootBuilder;
    const childBuilder = rootBuilder.child('child-segment', 'child-slug');
    expect(childBuilder.url.toString()).toBe(
      `${hostname}/child-segment/child-slug`,
    );
  });

  it('should create page URL', () => {
    const rootBuilder = UrlBuilder.rootBuilder;
    const pageUrl = rootBuilder.page('page', 'page-slug');
    expect(pageUrl.toString()).toBe(`${hostname}/page/page-slug`);
  });

  it('should create a sitemap builder', () => {
    const target = mappedUrlBuilderFactory();
    expect(target).not.toBeNull();
    const bulkEdit = target.email.bulkEdit();
    expect(bulkEdit.toString()).toBe(`/messages/email/bulk-edit`);
  });

  describe('UrlBuilder.page', () => {
    it('should return the base URL if no page is provided', () => {
      const builder = UrlBuilder.rootBuilder;
      expect(builder.page().toString()).toBe(`${hostname}/`);
    });

    it('should append query parameters if page is an object', () => {
      const builder = UrlBuilder.rootBuilder;
      const url = builder.page({ param1: 'value1', param2: 'value2' });
      expect(url.toString()).toBe(`${hostname}/?param1=value1&param2=value2`);
    });

    it('should return a URL with the page segment if page is a string', () => {
      const builder = UrlBuilder.rootBuilder;
      const url = builder.page('about');
      expect(url.toString()).toBe(`${hostname}/about`);
    });

    it('should throw an error if page contains a slash', () => {
      const builder = UrlBuilder.rootBuilder;
      expect(() => builder.page('about/us')).toThrow('Invalid page name.');
    });

    it('should return a URL with the page and slug if both are provided', () => {
      const builder = UrlBuilder.rootBuilder;
      const url = builder.page('about', 'team');
      expect(url.toString()).toBe(`${hostname}/about/team`);
    });

    it('should append query parameters if slug is an object', () => {
      const builder = UrlBuilder.rootBuilder;
      const url = builder.page('about', { param1: 'value1', param2: 'value2' });
      expect(url.toString()).toBe(
        `${hostname}/about?param1=value1&param2=value2`,
      );
    });

    it('should throw an error if slug contains a slash', () => {
      const builder = UrlBuilder.rootBuilder;
      expect(() => builder.page('about', 'team/us')).toThrow(
        'Invalid slug name.',
      );
    });

    it('should return a URL with the page, slug, and query parameters if all are provided', () => {
      const builder = UrlBuilder.rootBuilder;
      const url = builder.page('about', 'team', {
        param1: 'value1',
        param2: 'value2',
      });
      expect(url.toString()).toBe(
        `${hostname}/about/team?param1=value1&param2=value2`,
      );
    });
  });
});
