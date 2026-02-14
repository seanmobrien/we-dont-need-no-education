export default class ClickCallbackProcessor {
    pageName() {
        return window.document.title;
    }
    contentName(element, useDefaultContentName) {
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
//# sourceMappingURL=click-callback-processor.js.map