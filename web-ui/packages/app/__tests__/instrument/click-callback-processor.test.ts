/**
 * @jest-environment jsdom
 */
import ClickCallbackProcessor from '../../instrument/click-callback-processor';

describe('ClickCallbackProcessor', () => {
  const processor = new ClickCallbackProcessor();

  afterEach(() => {
    document.body.replaceChildren();
  });

  it('uses explicit element labels for content names', () => {
    const button = document.createElement('button');
    button.setAttribute('aria-label', 'Open evidence details');

    expect(processor.contentName(button)).toBe('Open evidence details');
  });

  it('resolves aria-labelledby content names', () => {
    const label = document.createElement('span');
    label.id = 'dialog-title';
    label.textContent = 'Review dialog';

    const button = document.createElement('button');
    button.setAttribute('aria-labelledby', label.id);

    document.body.append(label, button);

    expect(processor.contentName(button)).toBe('Review dialog');
  });

  it('returns a non-empty fallback for unlabeled controls', () => {
    const button = document.createElement('button');
    button.setAttribute('type', 'button');

    expect(processor.contentName(button)).toBe('button:button');
  });
});