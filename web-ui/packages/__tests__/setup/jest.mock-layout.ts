const originalGetBoundingClientRect = Element.prototype.getBoundingClientRect;

const isZeroRect = (rect: DOMRect | DOMRectReadOnly) =>
  rect.width === 0 &&
  rect.height === 0 &&
  rect.top === 0 &&
  rect.left === 0 &&
  rect.bottom === 0 &&
  rect.right === 0;

if (typeof window !== 'undefined' && typeof Element !== 'undefined') {
  Object.defineProperty(Element.prototype, 'getBoundingClientRect', {
    configurable: true,
    value: function mockLayoutAwareRect(this: Element) {
      const rect = originalGetBoundingClientRect.call(this);
      const connected = this.isConnected ?? document.contains(this);

      if (connected && isZeroRect(rect)) {
        return {
          width: 240,
          height: 40,
          top: 100,
          left: 100,
          bottom: 140,
          right: 340,
          x: 100,
          y: 100,
          toJSON: () => ({}),
        } as DOMRect;
      }

      return rect;
    },
  });
}

afterAll(() => {
  Element.prototype.getBoundingClientRect = originalGetBoundingClientRect;
});
