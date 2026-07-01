
export default class ClickCallbackProcessor {
  private static readonly MaxContentNameLength = 200;

  private normalizeContentName(value?: string | null): string | undefined {
    const normalized = value?.replace(/\s+/g, ' ').trim();
    return normalized
      ? normalized.slice(0, ClickCallbackProcessor.MaxContentNameLength)
      : undefined;
  }

  /**
   * Function to override the default pageName capturing behavior.
   */
  pageName(): string {
    return window.document.title;
  }
  /**
   * A callback function to augument the default pageTags collected during pageAction event.
  pageActionPageTags?: (element?: Element) => IPageTags;
   */
  /**
   * A callback function to populate customized contentName.
   */
  contentName(element?: Element, useDefaultContentName = true): string {
    if (!element) {
      return 'unknown-content';
    }

    let check =
      element.getAttribute('data-id') ??
      element.getAttribute('id') ??
      element.getAttribute('name') ??
      element.getAttribute('aria-label') ??
      element.getAttribute('title');
    if (check) {
      return this.normalizeContentName(check) ?? 'unknown-content';
    }

    const labelledBy = element.getAttribute('aria-labelledby');
    if (labelledBy) {
      const labelledElement = document.getElementById(labelledBy);
      if (labelledElement) {
        check =
          this.normalizeContentName(labelledElement.textContent) ??
          this.contentName(labelledElement, useDefaultContentName);
        if (check) {
          return check;
        }
      }
    }

    check =
      element.getAttribute('data-testid') ??
      element.getAttribute('value') ??
      element.getAttribute('alt') ??
      element.getAttribute('placeholder') ??
      element.textContent;

    const normalized = this.normalizeContentName(check);
    if (normalized) {
      return normalized;
    }

    const tagName = element.tagName.toLowerCase();
    const role = element.getAttribute('role');
    const type = element.getAttribute('type');
    return [tagName, role, type].filter(Boolean).join(':') || 'unknown-content';
  }
}
