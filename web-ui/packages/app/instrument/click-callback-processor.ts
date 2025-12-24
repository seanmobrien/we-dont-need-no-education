
export default class ClickCallbackProcessor {
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  contentName(element?: any, useDefaultContentName?: boolean) 
  {
    if (!element) {
      return '';
    }
    let check = element.getAttribute('data-id') ?? element.getAttribute('id') ?? element.getAttribute('name')
      ?? element.getAttribute('aria-label') ?? element.getAttribute('title');
    if (check) {
      return check;
    }
    const labelledBy = element.getAttribute('aria-labelledby');
    if (labelledBy) {
      const labelledElement = document.getElementById(labelledBy);
      if (labelledElement) {
        check = this.contentName(labelledElement, useDefaultContentName);
        if (check) {
          return check;
        } 
      }
    } 
    check = element.getAttribute('data-testid');
    const result = check || element.textContent?.trim() || '';
    return result;
  }
}