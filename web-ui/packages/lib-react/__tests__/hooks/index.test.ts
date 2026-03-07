import * as hooksIndex from '../../src/hooks';
import { useInEffect } from '../../src/hooks/useInEffect';
import { useDynamicWidth } from '../../src/hooks/use-dynamic-width';

describe('hooks index exports', () => {
    it('re-exports useInEffect and useDynamicWidth', () => {
        expect(hooksIndex.useInEffect).toBe(useInEffect);
        expect(hooksIndex.useDynamicWidth).toBe(useDynamicWidth);
    });
});
